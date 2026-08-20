import express from 'express';
import Student from '../models/Student.js';
import Note from '../models/Note.js';
import { protect } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleCheck.js';
import { calculateRiskBatch, getTopReasons } from '../services/riskCalculator.js';

const router = express.Router();

// GET /api/summary — admin and mentor dashboard stats
router.get('/', protect, requireRole('admin', 'mentor'), async (req, res) => {
  try {
    const query = req.user.role === 'mentor' ? { mentorId: req.user.mentorCode } : {};
    
    if (req.query.batchId === 'latest') {
      const lastStudent = await Student.findOne({ batchId: { $ne: null } }).sort({ createdAt: -1 });
      if (lastStudent && lastStudent.batchId) {
        query.batchId = lastStudent.batchId;
      } else {
        // If no batches exist, force an empty match
        query.batchId = 'none';
      }
    } else if (req.query.batchId) {
      query.batchId = req.query.batchId;
    }
    
    // Use MongoDB Aggregations to bypass network bottlenecks
    const matchStage = { $match: query };
    const facetStage = {
      $facet: {
        totalStudents: [{ $count: "count" }],
        unassignedCount: [
          { $match: { mentorId: { $in: [null, ""] } } },
          { $count: "count" }
        ],
        riskDistribution: [
          { $group: { _id: { $ifNull: ["$riskLevel", "Low"] }, count: { $sum: 1 } } }
        ],
        byDepartment: [
          {
            $group: {
              _id: { dept: { $ifNull: ["$department", "Unspecified"] }, risk: { $ifNull: ["$riskLevel", "Low"] } },
              count: { $sum: 1 }
            }
          }
        ],
        byClass: [
          {
            $group: {
              _id: { cls: { $ifNull: ["$class", "Unspecified"] }, risk: { $ifNull: ["$riskLevel", "Low"] } },
              count: { $sum: 1 }
            }
          }
        ],
        attendanceDistribution: [
          {
            $bucket: {
              groupBy: { $ifNull: ["$attendancePercent", 0] },
              boundaries: [0, 51, 66, 76, 86, 101],
              default: "Unknown",
              output: { count: { $sum: 1 } }
            }
          }
        ],
        testTrends: [
          { $match: { previous3TestsAvg: { $ne: null }, last3TestsAvg: { $ne: null } } },
          { $project: { _id: 0, x: "$previous3TestsAvg", y: "$last3TestsAvg", risk: { $ifNull: ["$riskLevel", "Low"] } } }
        ],
        highRiskStudents: [
          { $match: { riskLevel: "High" } },
          { $sort: { riskScore: -1 } },
          { $limit: 5 },
          {
            $project: {
              _id: 0,
              studentId: 1,
              firstName: 1,
              lastName: 1,
              class: 1,
              riskScore: 1,
              mlInsights: 1
            }
          }
        ]
      }
    };

    const [aggResult] = await Student.aggregate([matchStage, facetStage]);

    // Format results to match exactly what the frontend expects
    const totalStudents = aggResult.totalStudents[0]?.count || 0;
    const unassignedCount = aggResult.unassignedCount[0]?.count || 0;

    const distribution = { High: 0, Medium: 0, Low: 0 };
    aggResult.riskDistribution.forEach(d => { if(distribution[d._id] !== undefined) distribution[d._id] = d.count; });

    const byDepartment = {};
    aggResult.byDepartment.forEach(d => {
      const dept = d._id.dept;
      const risk = d._id.risk;
      if (!byDepartment[dept]) byDepartment[dept] = { High: 0, Medium: 0, Low: 0 };
      byDepartment[dept][risk] = d.count;
    });

    const byClass = {};
    aggResult.byClass.forEach(d => {
      const cls = d._id.cls;
      const risk = d._id.risk;
      if (!byClass[cls]) byClass[cls] = { High: 0, Medium: 0, Low: 0 };
      byClass[cls][risk] = d.count;
    });

    const attendanceDistribution = { '0-50%': 0, '51-65%': 0, '66-75%': 0, '76-85%': 0, '86-100%': 0 };
    aggResult.attendanceDistribution.forEach(b => {
      if (b._id === 0) attendanceDistribution['0-50%'] = b.count;
      else if (b._id === 51) attendanceDistribution['51-65%'] = b.count;
      else if (b._id === 66) attendanceDistribution['66-75%'] = b.count;
      else if (b._id === 76) attendanceDistribution['76-85%'] = b.count;
      else if (b._id === 86) attendanceDistribution['86-100%'] = b.count;
    });

    const testTrends = aggResult.testTrends;

    const highRiskStudents = aggResult.highRiskStudents.map(s => ({
      studentId: s.studentId,
      name: `${s.firstName} ${s.lastName}`,
      class: s.class,
      riskScore: Math.round((s.riskScore || 0) * 100),
      primaryIssue: getTopReasons(s.mlInsights)?.[0]?.reason || 'Multiple Factors'
    }));

    // Open interventions aging report
    const notesQuery = { status: 'open' };
    if (req.user.role === 'mentor') {
      const myStudentIds = await Student.find(query).distinct('studentId');
      notesQuery.studentId = { $in: myStudentIds };
    }
    const openNotes = await Note.find(notesQuery).sort({ createdAt: 1 });
    const now = Date.now();
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

    const agingReport = openNotes.map((n) => {
      const ageMs = now - new Date(n.createdAt).getTime();
      const ageDays = Math.floor(ageMs / (24 * 60 * 60 * 1000));
      return {
        noteId: n._id,
        studentId: n.studentId,
        ageDays,
        stale: ageMs > THIRTY_DAYS_MS,
      };
    });

    const staleCount = agingReport.filter((n) => n.stale).length;

    res.json({
      totalStudents,
      unassignedCount,
      riskDistribution: distribution,
      byDepartment,
      byClass,
      attendanceDistribution,
      testTrends,
      highRiskStudents,
      openInterventions: {
        total: openNotes.length,
        staleOver30Days: staleCount,
        details: agingReport,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

export default router;