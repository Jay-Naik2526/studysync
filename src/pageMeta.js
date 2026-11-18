// Per-page titles, status words and loading-screen tips (shared by the loader and the mission title card)
export const META = {
  dashboard:            { title: 'Dashboard',   scene: 'gauge',    words: ['Plotting your semester', 'Reading attendance', 'Averaging marks', 'Drawing the map'] },
  attendance:           { title: 'Attendance',  scene: 'register', words: ['Opening the register', 'Syncing portal marks', 'Counting present days', 'Checking the 80% line'] },
  calendar:             { title: 'Calendar',    scene: 'calendar', words: ['Turning the pages', 'Colouring each day', 'Tallying classes', 'Planning skips'] },
  classcount:           { title: 'Class count', scene: 'counter',  words: ['Counting lectures', 'Counting labs', 'Comparing with SAP', 'Finding the gap'] },
  marks:                { title: 'Marks',       scene: 'bars',     words: ['Collecting scores', 'Weighing tasks', 'Ranking subjects', 'Drawing the trend'] },
  subjects:             { title: 'Subjects',    scene: 'books',    words: ['Shelving subjects', 'Sorting by name', 'Tallying classes', 'Dusting the spines'] },
  notes:                { title: 'Study notes', scene: 'notes',    words: ['Sharpening pencils', 'Flipping to your notes', 'Highlighting key points', 'Binding the pages'] },
  planner:              { title: 'Planner',     scene: 'planner',  words: ['Unfolding the map', 'Placing waypoints', 'Charting the route', 'Calibrating the compass'] },
  applications:         { title: 'Applications', scene: 'envelope', words: ['Sorting the post', 'Checking statuses', 'Stamping approvals', 'Filing copies'] },
  profile:              { title: 'Profile',     scene: 'profile',  words: ['Finding your file', 'Pinning your details', 'Linking your mentor', 'Tidying the page'] },
  'mentor-dashboard':   { title: 'Overview',    scene: 'gauge',    words: ['Gathering your mentees', 'Reading attendance', 'Spotting who needs help', 'Drawing the overview'] },
  mentees:              { title: 'Mentees',     scene: 'network',  words: ['Calling the roll', 'Linking students', 'Checking progress', 'Mapping the group'] },
  'mentee-detail':      { title: 'Student',     scene: 'profile',  words: ['Opening the file', 'Reading attendance', 'Reading grades', 'Pinning the notes'] },
  'mentor-applications': { title: 'Inbox',      scene: 'envelope', words: ['Sorting the post', 'Reading requests', 'Flagging urgent ones', 'Filing copies'] },
};
export const ORDER = Object.keys(META);

// Loading-screen tips shown in the Neon Coast theme
export const TIPS = {
  dashboard: 'Keep every subject above 80% and your wanted level stays at zero',
  attendance: 'Attendance below 80% in a subject lights a star. Sync from SAP to see the true picture',
  calendar: 'Tap a day to see each class, or switch to the skip planner before you bunk',
  classcount: 'Labs that run back to back count as one lab session',
  marks: 'The goal calculator tells you the score you still need to hit a target',
  subjects: 'Add every subject once and the other pages fill themselves in',
  notes: 'Pick a subject and a topic, then generate notes, flashcards or a quiz',
  planner: 'Upload your syllabus and the planner charts a route that fits your weekly hours',
  applications: 'Attach proof when you apply for leave and the mentor can approve faster',
  profile: 'Join your mentor with their code so they can see how you are doing',
  'mentor-dashboard': 'Students under 80% are flagged first so you know who to call',
  mentees: 'Open any student to see their attendance, grades and applications',
  'mentee-detail': 'Everything about this student in one place',
  'mentor-applications': 'Review requests here. Approving takes one tap',
};
