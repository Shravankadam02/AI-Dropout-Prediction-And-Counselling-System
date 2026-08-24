const fs = require('fs');

const firstNames = ['Aarav', 'Vihaan', 'Vivaan', 'Ananya', 'Diya', 'Advik', 'Kabir', 'Anika', 'Navya', 'Ojas', 'Rahul', 'Sneha', 'Vikram', 'Priya', 'Amit', 'Neha', 'Rohan', 'Pooja', 'Karan', 'Riya', 'Sameer', 'Tanvi', 'Siddharth', 'Aditi', 'Pranav', 'Isha', 'Arjun', 'Meera', 'Aditya', 'Nidhi'];
const lastNames = ['Sharma', 'Verma', 'Gupta', 'Kumar', 'Singh', 'Patel', 'Joshi', 'Mishra', 'Reddy', 'Rao', 'Das', 'Chatterjee', 'Nair', 'Menon', 'Iyer', 'Pillai', 'Deshmukh', 'Kadam', 'Jadhav', 'Yadav', 'Pandey', 'Dubey', 'Tiwari', 'Bhat', 'Kaur', 'Kulkarni', 'Bose', 'Sen', 'Banerjee', 'Mehta'];
const departments = ['Computer Science', 'Information Technology', 'Electronics', 'Mechanical', 'Civil', 'Electrical'];
const classes = ['FE', 'SE', 'TE', 'BE'];
const semesters = ['1', '2', '3', '4', '5', '6', '7', '8'];

function randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max, decimals = 2) {
    return (Math.random() * (max - min) + min).toFixed(decimals);
}

const csvHeader = 'studentId,firstName,lastName,class,rollNo,college,department,mentorId,counsellorId,attendancePercent,feesDueDays,attemptsInSubjectX,lastTest1,lastTest2,lastTest3,last3TestsAvg,previous3TestsAvg,email,phone,guardianContact,semester,age,gender,attendance_percentage,previous_semester_gpa,backlogs,internal_marks_percentage,assignment_completion_rate,study_hours_per_week,failed_subjects,family_income,distance_from_college_km,fee_payment_delay,scholarship,extracurricular_participation\n';
let csvContent = csvHeader;

for (let i = 1; i <= 1000; i++) {
    const studentId = `STU2024${String(i).padStart(4, '0')}`;
    const firstName = randomChoice(firstNames);
    const lastName = randomChoice(lastNames);
    const studentClass = randomChoice(classes);
    const rollNo = randomInt(1, 100).toString();
    const college = 'MET Institute of Engineering';
    const department = randomChoice(departments);
    const mentorId = '';
    const counsellorId = '';
    
    // Core details
    const attendancePercent = randomInt(40, 100);
    const feesDueDays = randomChoice([0, 0, 0, 10, 30, 90, 120]);
    const attemptsInSubjectX = randomChoice([1, 1, 1, 2, 3]);
    
    // Tests
    const lastTest1 = randomInt(30, 100);
    const lastTest2 = randomInt(30, 100);
    const lastTest3 = randomInt(30, 100);
    const last3TestsAvg = ((lastTest1 + lastTest2 + lastTest3) / 3).toFixed(2);
    const previous3TestsAvg = randomInt(40, 95);
    
    // Contacts
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`;
    const phone = `9${randomInt(100000000, 999999999)}`;
    const guardianContact = `8${randomInt(100000000, 999999999)}`;
    const semester = randomChoice(semesters);
    
    // ML Features
    const age = randomInt(18, 24);
    const gender = randomChoice([0, 1]);
    const attendance_percentage = attendancePercent; 
    const previous_semester_gpa = randomFloat(4.0, 10.0, 2);
    const backlogs = randomChoice([0, 0, 0, 1, 2, 3]);
    const internal_marks_percentage = randomInt(40, 95);
    const assignment_completion_rate = randomInt(30, 100);
    const study_hours_per_week = randomInt(2, 25);
    const failed_subjects = backlogs;
    const family_income = randomChoice([150000, 300000, 500000, 800000, 1200000, 2000000]);
    const distance_from_college_km = randomFloat(1.0, 30.0, 1);
    const fee_payment_delay = feesDueDays > 0 ? 1 : 0;
    const scholarship = randomChoice([0, 0, 1]);
    const extracurricular_participation = randomChoice([0, 1]);

    const row = [
        studentId, firstName, lastName, studentClass, rollNo, college, department, mentorId, counsellorId, 
        attendancePercent, feesDueDays, attemptsInSubjectX, lastTest1, lastTest2, lastTest3, last3TestsAvg, previous3TestsAvg,
        email, phone, guardianContact, semester, age, gender, attendance_percentage, previous_semester_gpa, backlogs,
        internal_marks_percentage, assignment_completion_rate, study_hours_per_week, failed_subjects, family_income,
        distance_from_college_km, fee_payment_delay, scholarship, extracurricular_participation
    ].join(',');
    
    csvContent += row + '\n';
}

fs.writeFileSync('students_1000.csv', csvContent);
console.log('Successfully generated students_1000.csv with 1000 records');
