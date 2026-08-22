import User from '../models/User.js';

// Unambiguous alphabet — no O/0/I/1
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 5;
const MAX_RETRIES = 5;

/**
 * Generate a random MNT-XXXXX code.
 */
function randomCode() {
  let code = 'MNT-';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}

/**
 * Generate a unique mentor code and save it to the user document.
 * Retries on duplicate-key collision (the mentorCode field has a unique index).
 *
 * @param {string} userId – the mentor's user id
 * @returns {string} the generated code
 */
export async function generateMentorCode(userId) {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const code = randomCode();
    try {
      await User.updateOne({ _id: userId }, { $set: { mentorCode: code } });
      return code;
    } catch (err) {
      // 11000 = duplicate key error — retry with a new code
      if (err.code === 11000 && attempt < MAX_RETRIES - 1) continue;
      throw err;
    }
  }
  throw new Error('Could not generate a unique mentor code after retries.');
}
