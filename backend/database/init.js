const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../database.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('✅ Connected to SQLite database');
    initializeDatabase();
  }
});

function initializeDatabase() {
  db.serialize(() => {
    // Users table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        first_name TEXT,
        last_name TEXT,
        role TEXT CHECK(role IN ('student', 'admin', 'viewer')) DEFAULT 'student',
        points INTEGER DEFAULT 0,
        rank TEXT DEFAULT 'Beginner',
        streak INTEGER DEFAULT 0,
        last_quiz_date TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Subjects table
    db.run(`
      CREATE TABLE IF NOT EXISTS subjects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        icon TEXT,
        question_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Questions table
    db.run(`
      CREATE TABLE IF NOT EXISTS questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subject_id INTEGER NOT NULL,
        question_text TEXT NOT NULL,
        option_a TEXT NOT NULL,
        option_b TEXT NOT NULL,
        option_c TEXT NOT NULL,
        option_d TEXT NOT NULL,
        correct_answer TEXT CHECK(correct_answer IN ('A', 'B', 'C', 'D')) NOT NULL,
        explanation TEXT,
        difficulty TEXT CHECK(difficulty IN ('easy', 'medium', 'hard')) DEFAULT 'medium',
        topic TEXT,
        image_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (subject_id) REFERENCES subjects(id)
      )
    `);

    // Quiz sessions table
    db.run(`
      CREATE TABLE IF NOT EXISTS quiz_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        subject_id INTEGER NOT NULL,
        total_questions INTEGER NOT NULL,
        duration_seconds INTEGER NOT NULL,
        start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        end_time DATETIME,
        status TEXT CHECK(status IN ('active', 'completed', 'abandoned')) DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (subject_id) REFERENCES subjects(id)
      )
    `);

    // Quiz responses table
    db.run(`
      CREATE TABLE IF NOT EXISTS quiz_responses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        question_id INTEGER NOT NULL,
        user_answer TEXT CHECK(user_answer IN ('A', 'B', 'C', 'D', 'SKIP', 'FLAGGED')),
        is_correct BOOLEAN,
        time_spent_seconds INTEGER DEFAULT 0,
        flagged BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES quiz_sessions(id),
        FOREIGN KEY (question_id) REFERENCES questions(id)
      )
    `);

    // Quiz results table
    db.run(`
      CREATE TABLE IF NOT EXISTS quiz_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL UNIQUE,
        user_id INTEGER NOT NULL,
        subject_id INTEGER NOT NULL,
        total_questions INTEGER NOT NULL,
        correct_answers INTEGER NOT NULL,
        score REAL NOT NULL,
        percentage REAL NOT NULL,
        status TEXT CHECK(status IN ('pass', 'fail')) NOT NULL,
        time_taken_seconds INTEGER NOT NULL,
        badge TEXT,
        points_earned INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES quiz_sessions(id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (subject_id) REFERENCES subjects(id)
      )
    `);

    // User badges table
    db.run(`
      CREATE TABLE IF NOT EXISTS user_badges (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        badge_name TEXT NOT NULL,
        score_percentage INTEGER,
        earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Leaderboard data table
    db.run(`
      CREATE TABLE IF NOT EXISTS leaderboard_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL UNIQUE,
        total_quizzes INTEGER DEFAULT 0,
        average_score REAL DEFAULT 0,
        highest_score REAL DEFAULT 0,
        total_points INTEGER DEFAULT 0,
        rank_level TEXT DEFAULT 'Beginner',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Insert default subjects
    const defaultSubjects = [
      { name: 'English', description: 'English Language' },
      { name: 'Mathematics', description: 'Pure Mathematics' },
      { name: 'Physics', description: 'Physics' },
      { name: 'Chemistry', description: 'Chemistry' },
      { name: 'Biology', description: 'Biology' },
      { name: 'Government', description: 'Government/Civics' },
      { name: 'Economics', description: 'Economics' }
    ];

    defaultSubjects.forEach(subject => {
      db.run(
        'INSERT OR IGNORE INTO subjects (name, description) VALUES (?, ?)',
        [subject.name, subject.description]
      );
    });

    // Create default admin user
    const bcryptjs = require('bcryptjs');
    const hashedPassword = bcryptjs.hashSync('admin@123', 10);
    
    db.run(
      `INSERT OR IGNORE INTO users (email, username, password, role, first_name, last_name) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['admin@jamb.local', 'admin', hashedPassword, 'admin', 'Admin', 'User'],
      (err) => {
        if (!err) {
          console.log('✅ Default admin user created (admin@jamb.local / admin@123)');
        }
      }
    );

    console.log('✅ Database schema initialized successfully');
  });
}

module.exports = db;