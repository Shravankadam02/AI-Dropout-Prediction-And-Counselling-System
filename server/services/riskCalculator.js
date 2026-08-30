function extractPayload(s) {
  const attendance = (s.attendancePercent !== undefined && s.attendancePercent !== null) 
    ? s.attendancePercent 
    : (s.attendance_percentage ?? 75.0);

  const internalMarks = (s.last3TestsAvg !== undefined && s.last3TestsAvg !== null && s.last3TestsAvg > 0)
    ? s.last3TestsAvg
    : (s.internal_marks_percentage ?? 70.0);

  const prevGpa = s.previous_semester_gpa ?? (s.previous3TestsAvg ? Number((s.previous3TestsAvg / 10).toFixed(2)) : 7.0);

  const attempts = s.attemptsInSubjectX ?? 1;
  const backlogs = s.backlogs ?? (attempts > 1 ? attempts - 1 : 0);
  const failedSubjects = s.failed_subjects ?? (attempts > 1 ? attempts - 1 : 0);

  const feeDelay = (s.feesDueDays !== undefined && s.feesDueDays !== null && s.feesDueDays > 0)
    ? 1
    : (s.fee_payment_delay ?? 0);

  return {
    age: s.age ?? 20,
    gender: s.gender ?? 1,
    attendance_percentage: attendance,
    previous_semester_gpa: prevGpa,
    backlogs: backlogs,
    internal_marks_percentage: internalMarks,
    assignment_completion_rate: s.assignment_completion_rate ?? 80.0,
    study_hours_per_week: s.study_hours_per_week ?? 10,
    failed_subjects: failedSubjects,
    family_income: s.family_income ?? 300000,
    distance_from_college_km: s.distance_from_college_km ?? 10.0,
    fee_payment_delay: feeDelay,
    scholarship: s.scholarship ?? 0,
    extracurricular_participation: s.extracurricular_participation ?? 0
  };
}

export async function calculateRiskBatch(students) {
  if (!students || students.length === 0) return [];

  try {
    const payload = students.map(extractPayload);

    // Native fetch available in Node.js 18+
    const response = await fetch('http://127.0.0.1:8000/predict_batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      console.error('ML API Error:', response.statusText);
      throw new Error('Failed to fetch risk scores from ML model');
    }

    const results = await response.json();
    
    // Merge results with student data
    return students.map((s, index) => {
      const result = results[index];
      const riskScore = result.risk_score;
      let riskLevel = 'Low';
      if (riskScore >= 0.7) riskLevel = 'High';
      else if (riskScore >= 0.4) riskLevel = 'Medium';

      return {
        studentId: s.studentId,
        firstName: s.firstName,
        lastName: s.lastName,
        class: s.class,
        department: s.department,
        mentorId: s.mentorId,
        counsellorId: s.counsellorId,
        riskScore: Number(riskScore.toFixed(3)),
        riskLevel,
        mlInsights: result
      };
    });
  } catch (error) {
    console.error('Error calculating batch risk:', error);
    // Fallback if ML service is down
    return students.map(s => ({
      studentId: s.studentId,
      firstName: s.firstName,
      lastName: s.lastName,
      class: s.class,
      department: s.department,
      mentorId: s.mentorId,
      counsellorId: s.counsellorId,
      riskScore: 0,
      riskLevel: 'Low',
      mlInsights: null
    }));
  }
}

export async function calculateRisk(student) {
  try {
    const payload = extractPayload(student);

    const response = await fetch('http://127.0.0.1:8000/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      console.error('ML API Error:', response.statusText);
      throw new Error('Failed to fetch risk score from ML model');
    }

    const result = await response.json();
    const riskScore = result.risk_score;
    let riskLevel = 'Low';
    if (riskScore >= 0.7) riskLevel = 'High';
    else if (riskScore >= 0.4) riskLevel = 'Medium';

    return {
      riskScore: Number(riskScore.toFixed(3)),
      riskLevel,
      mlInsights: result
    };
  } catch (error) {
    console.error('Error calculating risk:', error);
    return {
      riskScore: 0,
      riskLevel: 'Low',
      mlInsights: null
    };
  }
}

export function getTopReasons(mlInsights) {
  if (!mlInsights || !mlInsights.top_factors) return [];
  
  // Format the raw features into readable strings
  const labels = {
    age: 'Student Age',
    gender: 'Gender',
    attendance_percentage: 'Low attendance',
    previous_semester_gpa: 'Low previous GPA',
    backlogs: 'Active backlogs',
    internal_marks_percentage: 'Declining internal marks',
    assignment_completion_rate: 'Low assignment completion',
    study_hours_per_week: 'Low study hours',
    failed_subjects: 'Multiple failed subjects',
    family_income: 'Family income',
    distance_from_college_km: 'Long commute distance',
    fee_payment_delay: 'Fee payment overdue',
    scholarship: 'Lack of scholarship',
    extracurricular_participation: 'No extracurricular participation'
  };

  return mlInsights.top_factors
    .filter(factor => factor.impact > 0.02) // Only significant positive impact (increases risk)
    .sort((a, b) => b.impact - a.impact)
    .slice(0, 3)
    .map(factor => ({
      reason: labels[factor.feature] || factor.feature,
      severity: Number(factor.impact.toFixed(3))
    }));
}

export function generateRecommendations(riskLevel, mlInsights, student) {
  const recs = [];

  // 1. Direct evaluation from student metrics if available
  if (student) {
    const attendance = (student.attendancePercent !== undefined && student.attendancePercent !== null)
      ? student.attendancePercent
      : student.attendance_percentage;

    if (attendance !== undefined && attendance !== null) {
      if (attendance < 60) {
        recs.push(`Schedule immediate attendance counseling with the student (current attendance is critically low at ${attendance}%)`);
      } else if (attendance < 75) {
        recs.push(`Monitor attendance closely and discuss missed lectures (current attendance: ${attendance}%)`);
      }
    }

    if (student.feesDueDays && student.feesDueDays > 0) {
      recs.push(`Connect student with fee-waiver/installment options (fees overdue by ${student.feesDueDays} days)`);
    }

    if (student.attemptsInSubjectX && student.attemptsInSubjectX > 1) {
      recs.push(`Recommend peer tutoring and faculty doubt sessions for repeated subject attempts`);
    }

    if (student.last3TestsAvg !== undefined && student.last3TestsAvg !== null && student.last3TestsAvg < 50) {
      recs.push(`Arrange remedial classes for recent weak subjects (recent test avg: ${student.last3TestsAvg}%)`);
    } else if (
      student.last3TestsAvg !== undefined &&
      student.previous3TestsAvg !== undefined &&
      student.last3TestsAvg < student.previous3TestsAvg &&
      student.previous3TestsAvg - student.last3TestsAvg >= 8
    ) {
      recs.push(`Review recent test performance dip (recent ${student.last3TestsAvg}% vs previous ${student.previous3TestsAvg}%)`);
    }
  }

  // 2. Recommendations from ML Insights top factors
  if (mlInsights && mlInsights.top_factors) {
    mlInsights.top_factors.forEach(factor => {
      if (factor.impact > 0.05) {
        if (factor.feature === 'attendance_percentage' && !recs.some(r => r.includes('attendance'))) {
          recs.push('Schedule attendance counseling with the student');
        }
        if ((factor.feature === 'internal_marks_percentage' || factor.feature === 'previous_semester_gpa') && !recs.some(r => r.includes('remedial') || r.includes('test'))) {
          recs.push('Arrange remedial classes for recent weak subjects');
        }
        if ((factor.feature === 'fee_payment_delay' || factor.feature === 'family_income') && !recs.some(r => r.includes('fee'))) {
          recs.push('Connect student with fee-waiver/installment options');
        }
        if ((factor.feature === 'failed_subjects' || factor.feature === 'backlogs') && !recs.some(r => r.includes('peer tutoring') || r.includes('repeated'))) {
          recs.push('Recommend peer tutoring for repeated subject attempts');
        }
        if (factor.feature === 'study_hours_per_week') {
          recs.push('Discuss study habits and time management strategies');
        }
        if (factor.feature === 'assignment_completion_rate') {
          recs.push('Monitor assignment submissions closely');
        }
      }
    });
  }

  // 3. Fallbacks based on risk level
  if (riskLevel === 'High' && recs.length === 0) {
    recs.push('Schedule an immediate one-on-one check-in');
  }

  if (recs.length === 0) {
    recs.push('Maintain regular academic progress check-ins with your mentor');
  }

  return [...new Set(recs)];
}