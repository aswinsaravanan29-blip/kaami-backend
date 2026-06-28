const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const db = require('../db');

// @route    GET api/profile/public/:username
// @desc     Get public profile data by username
// @access   Public
router.get('/public/:username', async (req, res) => {
  try {
    const { username } = req.params;

    // 1. Fetch profile
    const [profiles] = await db.query('SELECT * FROM profiles WHERE username = ?', [username]);
    if (profiles.length === 0) {
      return res.status(404).json({ msg: 'Profile not found' });
    }

    const profile = profiles[0];
    const userId = profile.user_id;

    // Fetch user email
    const [users] = await db.query('SELECT email FROM users WHERE id = ?', [userId]);
    const email = users.length > 0 ? users[0].email : null;

    // 2. Fetch projects
    const [projects] = await db.query('SELECT * FROM projects WHERE user_id = ?', [userId]);

    // 3. Fetch certificates
    const [certificates] = await db.query('SELECT * FROM certificates WHERE user_id = ?', [userId]);

    // 4. Fetch testimonials
    const [testimonials] = await db.query('SELECT * FROM testimonials WHERE user_id = ?', [userId]);

    // 5. Fetch experiences
    const [experiences] = await db.query('SELECT * FROM experiences WHERE user_id = ?', [userId]);

    // Parse tech_stack JSON for projects
    const parsedProjects = projects.map(proj => {
      let tech = [];
      try {
        tech = proj.tech_stack ? JSON.parse(proj.tech_stack) : [];
      } catch (e) {
        tech = proj.tech_stack ? proj.tech_stack.split(',') : [];
      }
      return { ...proj, tech };
    });

    // Parse evidence JSON for experiences
    const parsedExperiences = experiences.map(exp => {
      let evidence = [];
      try {
        evidence = exp.evidence ? JSON.parse(exp.evidence) : [];
      } catch (e) {
        evidence = exp.evidence ? exp.evidence.split(',') : [];
      }
      return { ...exp, evidence };
    });

    res.json({
      profile: {
        username: profile.username,
        displayName: profile.display_name,
        profession: profile.profession,
        themeMode: profile.theme_mode,
        bio: profile.bio,
        availability: profile.availability,
        email: email,
        checkedTasks: profile.checked_tasks ? JSON.parse(profile.checked_tasks) : {}
      },
      projects: parsedProjects,
      certificates,
      testimonials,
      experiences: parsedExperiences
    });
  } catch (err) {
    console.error("Fetch Public Profile Error:", err.message);
    res.status(500).send('Server error');
  }
});

// @route    POST api/profile/public/contact/:username
// @desc     Submit contact message from public profile
// @access   Public
router.post('/public/contact/:username', async (req, res) => {
  const { username } = req.params;
  const { senderName, email, message } = req.body;

  if (!senderName || !message) {
    return res.status(400).json({ msg: 'Sender name and message are required' });
  }

  try {
    // Find the user id for the given username
    const [profiles] = await db.query('SELECT user_id FROM profiles WHERE username = ?', [username]);
    if (profiles.length === 0) {
      return res.status(404).json({ msg: 'Profile not found' });
    }

    const userId = profiles[0].user_id;
    const details = `Email: ${email || 'N/A'}\nMessage: ${message}`;

    await db.query(`
      INSERT INTO inbox_items (user_id, type, requester, details, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `, [userId, 'Contact Message', senderName, details, new Date().toLocaleString()]);

    res.json({ msg: 'Message sent successfully!' });
  } catch (err) {
    console.error("Public Contact Error:", err.message);
    res.status(500).send('Server error');
  }
});

// @route    GET api/profile/check-username/:username
// @desc     Check if a username is available (not taken and not reserved)
// @access   Public
router.get('/check-username/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const reserved = ["admin", "discover", "jobs", "verified", "community", "marketplace", "dashboard", "login", "register", "settings", "billing"];
    
    if (reserved.includes(username.toLowerCase())) {
      return res.json({ available: false, msg: 'Username is reserved' });
    }

    const [profiles] = await db.query('SELECT user_id FROM profiles WHERE username = ?', [username]);
    if (profiles.length > 0) {
      return res.json({ available: false, msg: 'Username is already taken' });
    }

    res.json({ available: true });
  } catch (err) {
    console.error("Check Username Error:", err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route    GET api/profile
// @desc     Get current user's profile and all associated data
// @access   Private
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Fetch profile settings
    const [profiles] = await db.query('SELECT * FROM profiles WHERE user_id = ?', [userId]);
    const profile = profiles[0] || null;

    // 2. Fetch projects
    const [projects] = await db.query('SELECT * FROM projects WHERE user_id = ?', [userId]);

    // 3. Fetch certificates
    const [certificates] = await db.query('SELECT * FROM certificates WHERE user_id = ?', [userId]);

    // 4. Fetch testimonials
    const [testimonials] = await db.query('SELECT * FROM testimonials WHERE user_id = ?', [userId]);

    // 5. Fetch inbox items
    const [inboxItems] = await db.query('SELECT * FROM inbox_items WHERE user_id = ?', [userId]);

    // 6. Fetch activities
    const [activities] = await db.query('SELECT * FROM activities WHERE user_id = ?', [userId]);

    // 7. Fetch experiences
    const [experiences] = await db.query('SELECT * FROM experiences WHERE user_id = ?', [userId]);

    // Parse tech_stack JSON for projects
    const parsedProjects = projects.map(proj => {
      let tech = [];
      try {
        tech = proj.tech_stack ? JSON.parse(proj.tech_stack) : [];
      } catch (e) {
        tech = proj.tech_stack ? proj.tech_stack.split(',') : [];
      }
      return { ...proj, tech };
    });

    // Parse evidence JSON for experiences
    const parsedExperiences = experiences.map(exp => {
      let evidence = [];
      try {
        evidence = exp.evidence ? JSON.parse(exp.evidence) : [];
      } catch (e) {
        evidence = exp.evidence ? exp.evidence.split(',') : [];
      }
      return { ...exp, evidence };
    });

    // Parse checked_tasks JSON for profile
    let checkedTasks = {
      "add-photo": false,
      "connect-github": false,
      "connect-linkedin": false,
      "upload-resume": false,
      "add-project": false,
      "add-certificate": false,
      "add-experience": false,
      "publish-profile": false,
      "share-profile": false
    };

    if (profile && profile.checked_tasks) {
      try {
        checkedTasks = JSON.parse(profile.checked_tasks);
      } catch (e) {
        console.error("Failed to parse checked tasks:", e);
      }
    }

    res.json({
      profile: profile ? {
        username: profile.username,
        displayName: profile.display_name,
        profession: profile.profession,
        themeMode: profile.theme_mode,
        bio: profile.bio,
        availability: profile.availability,
        checkedTasks
      } : null,
      projects: parsedProjects,
      certificates,
      testimonials,
      inboxItems,
      activities,
      experiences: parsedExperiences
    });

  } catch (err) {
    console.error("Fetch Profile Error:", err.message);
    res.status(500).send('Server error');
  }
});

// @route    POST api/profile
// @desc     Create or update profile settings
// @access   Private
router.post('/', auth, async (req, res) => {
  const { username, displayName, profession, themeMode, bio, availability, checkedTasks } = req.body;

  if (!username || !displayName || !profession) {
    return res.status(400).json({ msg: 'Please provide username, display name, and profession' });
  }

  try {
    const userId = req.user.id;
    const checkedTasksString = checkedTasks ? JSON.stringify(checkedTasks) : '{}';

    // Check if username is taken by another user
    const [taken] = await db.query('SELECT user_id FROM profiles WHERE username = ? AND user_id != ?', [username, userId]);
    if (taken.length > 0) {
      return res.status(400).json({ msg: 'Username slug is already reserved' });
    }

    await db.query(`
      INSERT INTO profiles (user_id, username, display_name, profession, theme_mode, bio, availability, checked_tasks)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        username = VALUES(username),
        display_name = VALUES(display_name),
        profession = VALUES(profession),
        theme_mode = VALUES(theme_mode),
        bio = VALUES(bio),
        availability = VALUES(availability),
        checked_tasks = VALUES(checked_tasks)
    `, [userId, username, displayName, profession, themeMode || 'modern', bio || '', availability || 'open-roles', checkedTasksString]);

    res.json({ msg: 'Profile updated successfully' });
  } catch (err) {
    console.error("Update Profile Error:", err.message);
    res.status(500).send('Server error');
  }
});

// @route    POST api/profile/project
// @desc     Add a project
// @access   Private
router.post('/project', auth, async (req, res) => {
  const { id, title, description, tech, link, year } = req.body;

  if (!id || !title || !description) {
    return res.status(400).json({ msg: 'Project ID, title, and description are required' });
  }

  try {
    const userId = req.user.id;
    const techStackString = tech ? JSON.stringify(tech) : '[]';

    await db.query(`
      INSERT INTO projects (id, user_id, title, description, tech_stack, link, year)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [id, userId, title, description, techStackString, link || '', year || '2026']);

    res.json({ msg: 'Project added successfully' });
  } catch (err) {
    console.error("Add Project Error:", err.message);
    res.status(500).send('Server error');
  }
});

// @route    POST api/profile/certificate
// @desc     Add a certificate
// @access   Private
router.post('/certificate', auth, async (req, res) => {
  const { id, title, issuer, credId, date, fileUrl } = req.body;

  if (!id || !title || !issuer) {
    return res.status(400).json({ msg: 'Certificate ID, title, and issuer are required' });
  }

  try {
    const userId = req.user.id;

    await db.query(`
      INSERT INTO certificates (id, user_id, title, issuer, credential_id, issue_date, file_url)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [id, userId, title, issuer, credId || '', date || '', fileUrl || null]);

    res.json({ msg: 'Certificate linked successfully' });
  } catch (err) {
    console.error("Add Certificate Error:", err.message);
    res.status(500).send('Server error');
  }
});

// @route    POST api/profile/inbox
// @desc     Add item to verification inbox
// @access   Private
router.post('/inbox', auth, async (req, res) => {
  const { type, requester, details, timestamp } = req.body;

  if (!type || !requester || !details) {
    return res.status(400).json({ msg: 'Verification type, requester, and details are required' });
  }

  try {
    const userId = req.user.id;

    const [result] = await db.query(`
      INSERT INTO inbox_items (user_id, type, requester, details, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `, [userId, type, requester, details, timestamp || 'Just now']);

    res.json({ id: result.insertId, msg: 'Verification request queued' });
  } catch (err) {
    console.error("Queue Inbox Error:", err.message);
    res.status(500).send('Server error');
  }
});

// @route    POST api/profile/inbox/action
// @desc     Approve or Reject verification request
// @access   Private
router.post('/inbox/action', auth, async (req, res) => {
  const { id, action } = req.body;

  if (!id || !action) {
    return res.status(400).json({ msg: 'Request ID and action are required' });
  }

  try {
    const userId = req.user.id;

    // Fetch inbox item details
    const [items] = await db.query('SELECT * FROM inbox_items WHERE id = ? AND user_id = ?', [id, userId]);
    if (items.length === 0) {
      return res.status(404).json({ msg: 'Request item not found' });
    }

    const item = items[0];

    // Update status
    await db.query('UPDATE inbox_items SET status = ? WHERE id = ?', [action, id]);

    // If approved, copy to actual testimonial table if it is endorsement type
    if (action === 'Approved' && item.type.includes('Testimonial')) {
      const words = item.requester.split('(');
      const author = words[0].trim();
      const role = words[1] ? words[1].replace(')', '').trim() : 'Manager';

      await db.query(`
        INSERT INTO testimonials (user_id, author, role, quote)
        VALUES (?, ?, ?, ?)
      `, [userId, author, role, item.details]);
    }

    res.json({ msg: `Request ${action} successfully` });
  } catch (err) {
    console.error("Inbox Action Error:", err.message);
    res.status(500).send('Server error');
  }
});

// @route    POST api/profile/activity
// @desc     Log recent activity event
// @access   Private
router.post('/activity', auth, async (req, res) => {
  const { text, type, timestamp } = req.body;

  if (!text) {
    return res.status(400).json({ msg: 'Activity text is required' });
  }

  try {
    const userId = req.user.id;

    await db.query(`
      INSERT INTO activities (user_id, text, type, timestamp)
      VALUES (?, ?, ?, ?)
    `, [userId, text, type || 'info', timestamp || 'Just now']);

    res.json({ msg: 'Activity logged successfully' });
  } catch (err) {
    console.error("Log Activity Error:", err.message);
    res.status(500).send('Server error');
  }
});

// @route    POST api/profile/experience
// @desc     Add a work experience node
// @access   Private
router.post('/experience', auth, async (req, res) => {
  const { role, company, timePeriod, description, evidence } = req.body;

  if (!role || !company || !timePeriod) {
    return res.status(400).json({ msg: 'Role, company, and time period are required' });
  }

  try {
    const userId = req.user.id;

    // serialize evidence array to JSON
    const evidenceJson = Array.isArray(evidence) ? JSON.stringify(evidence) : JSON.stringify([]);

    await db.query(`
      INSERT INTO experiences (user_id, role, company, time_period, description, evidence)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [userId, role, company, timePeriod, description || '', evidenceJson]);

    res.json({ msg: 'Work experience logged successfully' });
  } catch (err) {
    console.error("Add Experience Error:", err.message);
    res.status(500).send('Server error');
  }
});

// @route    DELETE api/profile/experience/:id
// @desc     Delete a work experience node
// @access   Private
router.delete('/experience/:id', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const [experiences] = await db.query('SELECT user_id FROM experiences WHERE id = ?', [id]);
    if (experiences.length === 0) {
      return res.status(404).json({ msg: 'Experience not found' });
    }

    if (experiences[0].user_id !== userId) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    await db.query('DELETE FROM experiences WHERE id = ?', [id]);
    res.json({ msg: 'Experience deleted successfully' });
  } catch (err) {
    console.error("Delete Experience Error:", err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
