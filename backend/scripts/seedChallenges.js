const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Challenge = require('../models/Challenge');
const User = require('../models/User');

// Load environment variables
dotenv.config();

// Connect to MongoDB
console.log('Attempting to connect to MongoDB...');
console.log('MONGO_URI:', process.env.MONGO_URI ? 'Defined' : 'Undefined');

mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('MongoDB Connected Successfully'))
.catch(err => {
  console.error('MongoDB Connection Error:', err);
  process.exit(1);
});

// Sample challenges data
const challenges = [
  // Web Exploitation Challenges
  {
    title: 'Cookie Monster',
    description: 'Can you find the secret cookie that grants admin access to this website? The flag is hidden in the admin dashboard.\n\nURL: http://cookie-monster.ctf.local',
    category: 'web',
    difficulty: 'Easy',
    points: 100,
    flag: 'CTF{c00k13_m0n5t3r_15_hungry}',
    hints: [
      { content: 'Have you checked the browser\'s developer tools?', cost: 10 },
      { content: 'Look for cookies that might control access levels.', cost: 20 }
    ],
    isVisible: true
  },
  {
    title: 'SQL Injection 101',
    description: 'This login page seems to have a basic SQL injection vulnerability. Can you bypass the authentication?\n\nURL: http://sql-injection-101.ctf.local',
    category: 'web',
    difficulty: 'Easy',
    points: 150,
    flag: 'CTF{5ql_1nj3ct10n_m4st3r}',
    hints: [
      { content: 'Try using single quotes in the input fields.', cost: 10 },
      { content: 'What happens if you enter \' OR 1=1 -- in the username field?', cost: 20 }
    ],
    isVisible: true
  },
  {
    title: 'Hidden Directory',
    description: 'There\'s a secret directory on this website that contains the flag. Can you find it?\n\nURL: http://hidden-directory.ctf.local',
    category: 'web',
    difficulty: 'Easy',
    points: 100,
    flag: 'CTF{d1r3ct0ry_tr4v3rs4l_f0und_m3}',
    hints: [
      { content: 'Check common directory names that might contain sensitive information.', cost: 10 },
      { content: 'Have you tried looking for a robots.txt file?', cost: 20 }
    ],
    isVisible: true
  },
  {
    title: 'XSS Challenge',
    description: 'This website has a comment section that doesn\'t properly sanitize user input. Can you execute a cross-site scripting attack to steal the admin\'s cookie?\n\nURL: http://xss-challenge.ctf.local',
    category: 'web',
    difficulty: 'Easy',
    points: 200,
    flag: 'CTF{cr055_s1t3_scr1pt1ng_vuln3r4b1l1ty}',
    hints: [
      { content: 'Try inserting HTML tags in the comment field.', cost: 10 },
      { content: 'What happens if you include a <script> tag?', cost: 20 }
    ],
    isVisible: true
  },
  {
    title: 'Broken Authentication',
    description: 'This website has a broken authentication mechanism. Find a way to log in as the administrator without knowing the password.\n\nURL: http://broken-auth.ctf.local',
    category: 'web',
    difficulty: 'Easy',
    points: 150,
    flag: 'CTF{br0k3n_4uth3nt1c4t10n_byp4ss3d}',
    hints: [
      { content: 'Check if the password reset functionality is secure.', cost: 10 },
      { content: 'Try manipulating the user ID parameter in the URL.', cost: 20 }
    ],
    isVisible: true
  },

  // Cryptography Challenges
  {
    title: 'Caesar\'s Secret',
    description: 'Julius Caesar used a simple substitution cipher to protect his messages. Can you decrypt this message?\n\nCiphertext: JDV{julcdu_jyfxuh_yd_qsdy_ed}',
    category: 'crypto',
    difficulty: 'Easy',
    points: 100,
    flag: 'CTF{caesar_cipher_in_acti_on}',
    hints: [
      { content: 'Try shifting each letter by a fixed number of positions.', cost: 10 },
      { content: 'The shift value is between 1 and 25.', cost: 20 }
    ],
    isVisible: true
  },
  {
    title: 'Base64 Decode',
    description: 'This message has been encoded multiple times using Base64. Can you decode it to find the flag?\n\nEncoded message: VkVaSlVFTlVSbnQwY21sd2JHVmZZbUZ6WlRZMFgzUmxjM1JmWm14aFozMD0=',
    category: 'crypto',
    difficulty: 'Easy',
    points: 100,
    flag: 'CTF{triple_base64_test_flag}',
    hints: [
      { content: 'You\'ll need to decode this message multiple times.', cost: 10 },
      { content: 'Try using an online Base64 decoder.', cost: 20 }
    ],
    isVisible: true
  },
  {
    title: 'Vigenère Cipher',
    description: 'This message has been encrypted using the Vigenère cipher. The key is the name of a famous cryptographer.\n\nCiphertext: DXJ{zmkvrxvi_gltilv_mv_xfcgxrkitdlc}',
    category: 'crypto',
    difficulty: 'Easy',
    points: 150,
    flag: 'CTF{vigenere_cipher_is_cryptanalyzed}',
    hints: [
      { content: 'The key is the last name of the person who created frequency analysis.', cost: 10 },
      { content: 'Try "kasiski" as the key.', cost: 20 }
    ],
    isVisible: true
  },
  {
    title: 'Hash Cracking',
    description: 'Can you crack this MD5 hash to find the flag? The flag is the plaintext.\n\nHash: 5f4dcc3b5aa765d61d8327deb882cf99',
    category: 'crypto',
    difficulty: 'Easy',
    points: 100,
    flag: 'CTF{password}',
    hints: [
      { content: 'This is a very common password.', cost: 10 },
      { content: 'Try using an online MD5 hash cracker.', cost: 20 }
    ],
    isVisible: true
  },
  {
    title: 'RSA Basics',
    description: 'You\'ve intercepted an RSA encrypted message and the private key. Can you decrypt it?\n\nn = 143, e = 7, d = 103, c = 87',
    category: 'crypto',
    difficulty: 'Easy',
    points: 200,
    flag: 'CTF{rsa_decryption_success}',
    hints: [
      { content: 'Use the formula m = c^d mod n to decrypt.', cost: 10 },
      { content: 'The decrypted value is an ASCII code.', cost: 20 }
    ],
    isVisible: true
  },

  // Forensics Challenges
  {
    title: 'Hidden in Plain Sight',
    description: 'There\'s a flag hidden in this image. Can you find it?\n\nDownload: hidden.jpg',
    category: 'forensics',
    difficulty: 'Easy',
    points: 100,
    flag: 'CTF{st3g4n0gr4phy_1s_fun}',
    hints: [
      { content: 'Have you tried using steganography tools?', cost: 10 },
      { content: 'Try using "steghide" with an empty passphrase.', cost: 20 }
    ],
    isVisible: true
  },
  {
    title: 'Metadata Explorer',
    description: 'This image contains important metadata that will lead you to the flag.\n\nDownload: metadata.jpg',
    category: 'forensics',
    difficulty: 'Easy',
    points: 100,
    flag: 'CTF{m3t4d4t4_r3v34ls_s3cr3ts}',
    hints: [
      { content: 'Try using exiftool to examine the image.', cost: 10 },
      { content: 'Check the comment field in the metadata.', cost: 20 }
    ],
    isVisible: true
  },
  {
    title: 'Corrupted ZIP',
    description: 'This ZIP file is corrupted, but the flag is still inside. Can you repair it and extract the contents?\n\nDownload: corrupted.zip',
    category: 'forensics',
    difficulty: 'Easy',
    points: 150,
    flag: 'CTF{z1p_f1l3_r3p41r3d}',
    hints: [
      { content: 'The file header might be corrupted.', cost: 10 },
      { content: 'Try using a hex editor to fix the magic bytes.', cost: 20 }
    ],
    isVisible: true
  },
  {
    title: 'Network Capture',
    description: 'We captured some network traffic that contains a flag. Can you analyze the PCAP file to find it?\n\nDownload: capture.pcap',
    category: 'forensics',
    difficulty: 'Easy',
    points: 200,
    flag: 'CTF{w1r3sh4rk_m4st3r}',
    hints: [
      { content: 'Look for HTTP traffic in the capture.', cost: 10 },
      { content: 'Try following the TCP stream of suspicious packets.', cost: 20 }
    ],
    isVisible: true
  },
  {
    title: 'Memory Dump',
    description: 'We have a memory dump from a compromised system. Can you find the flag that was in the process memory?\n\nDownload: memory.dmp',
    category: 'forensics',
    difficulty: 'Easy',
    points: 200,
    flag: 'CTF{m3m0ry_f0r3ns1cs_w1n}',
    hints: [
      { content: 'Try using Volatility to analyze the memory dump.', cost: 10 },
      { content: 'Look for strings in the memory that match the flag format.', cost: 20 }
    ],
    isVisible: true
  },

  // Reverse Engineering Challenges
  {
    title: 'Hello World',
    description: 'This is a simple binary that prints a message. Can you find the hidden flag?\n\nDownload: hello',
    category: 'reverse',
    difficulty: 'Easy',
    points: 100,
    flag: 'CTF{r3v3rs1ng_b1n4ry_f1l3s}',
    hints: [
      { content: 'Try using the "strings" command on the binary.', cost: 10 },
      { content: 'The flag might be obfuscated or encoded.', cost: 20 }
    ],
    isVisible: true
  },
  {
    title: 'Password Checker',
    description: 'This program checks if a password is correct. Can you figure out what the correct password is?\n\nDownload: password_checker',
    category: 'reverse',
    difficulty: 'Easy',
    points: 150,
    flag: 'CTF{r3v3rs3_3ng1n33r1ng_w1n}',
    hints: [
      { content: 'Try using a debugger to step through the program.', cost: 10 },
      { content: 'Look for string comparison functions in the code.', cost: 20 }
    ],
    isVisible: true
  },
  {
    title: 'Simple Crackme',
    description: 'This is a simple crackme challenge. Find the correct input to get the flag.\n\nDownload: crackme',
    category: 'reverse',
    difficulty: 'Easy',
    points: 150,
    flag: 'CTF{cr4ckm3_s0lv3d_c0ngr4ts}',
    hints: [
      { content: 'Try using Ghidra or IDA Pro to decompile the binary.', cost: 10 },
      { content: 'Look for the function that validates the input.', cost: 20 }
    ],
    isVisible: true
  },
  {
    title: 'Java Reversing',
    description: 'This Java program contains a hidden flag. Can you decompile it and find the flag?\n\nDownload: hidden.jar',
    category: 'reverse',
    difficulty: 'Easy',
    points: 200,
    flag: 'CTF{j4v4_d3c0mp1l4t10n_ftw}',
    hints: [
      { content: 'Try using a Java decompiler like JD-GUI.', cost: 10 },
      { content: 'The flag might be constructed at runtime.', cost: 20 }
    ],
    isVisible: true
  },
  {
    title: 'Python Bytecode',
    description: 'We found this Python bytecode file (.pyc). Can you reverse it to find the flag?\n\nDownload: secret.pyc',
    category: 'reverse',
    difficulty: 'Easy',
    points: 200,
    flag: 'CTF{pyth0n_byt3c0d3_r3v3rs1ng}',
    hints: [
      { content: 'Try using a Python decompiler like uncompyle6.', cost: 10 },
      { content: 'The flag might be encrypted in the code.', cost: 20 }
    ],
    isVisible: true
  },

  // Miscellaneous Challenges
  {
    title: 'QR Code Puzzle',
    description: 'This QR code contains a secret message. Can you decode it?\n\nDownload: qr.png',
    category: 'misc',
    difficulty: 'Easy',
    points: 100,
    flag: 'CTF{qr_c0d3_sc4nn3d}',
    hints: [
      { content: 'Use a QR code scanner to read the code.', cost: 10 },
      { content: 'The QR code might lead to another clue.', cost: 20 }
    ],
    isVisible: true
  },
  {
    title: 'Morse Code',
    description: 'Decode this Morse code to find the flag:\n\n... --- ... -.-. - ..-. -- --- .-. ... . -.-. --- -.. . -.. . -.-. --- -.. . -.. ..--.-',
    category: 'misc',
    difficulty: 'Easy',
    points: 100,
    flag: 'CTF{morse_code_decoded}',
    hints: [
      { content: 'Use a Morse code translator.', cost: 10 },
      { content: 'Remember that dots are short signals and dashes are long signals.', cost: 20 }
    ],
    isVisible: true
  },
  {
    title: 'Binary Puzzle',
    description: 'Convert this binary string to ASCII to find the flag:\n\n01000011 01010100 01000110 01111011 01100010 01101001 01101110 01100001 01110010 01111001 01011111 01110100 01101111 01011111 01100001 01110011 01100011 01101001 01101001 01111101',
    category: 'misc',
    difficulty: 'Easy',
    points: 100,
    flag: 'CTF{binary_to_ascii}',
    hints: [
      { content: 'Each 8-bit binary number represents one ASCII character.', cost: 10 },
      { content: 'Try using an online binary to ASCII converter.', cost: 20 }
    ],
    isVisible: true
  },
  {
    title: 'Hidden Message',
    description: 'There\'s a hidden message in this text. Can you find it?\n\nCan you find the hidden message? The first letter of each sentence will help you reveal the flag.',
    category: 'misc',
    difficulty: 'Easy',
    points: 150,
    flag: 'CTF{first_letter}',
    hints: [
      { content: 'Look at the first letter of each sentence.', cost: 10 },
      { content: 'Combine the letters to form the flag.', cost: 20 }
    ],
    isVisible: true
  },
  {
    title: 'Audio Steganography',
    description: 'There\'s a hidden message in this audio file. Can you extract it?\n\nDownload: secret.wav',
    category: 'misc',
    difficulty: 'Easy',
    points: 200,
    flag: 'CTF{4ud10_st3g4n0gr4phy}',
    hints: [
      { content: 'Try using audio analysis tools like Audacity.', cost: 10 },
      { content: 'Look at the spectrogram of the audio file.', cost: 20 }
    ],
    isVisible: true
  }
];

// Function to seed challenges
const seedChallenges = async () => {
  try {
    console.log('Starting challenge seeding process...');

    // Clear existing challenges
    console.log('Attempting to clear existing challenges...');
    await Challenge.deleteMany();
    console.log('Successfully cleared existing challenges');

    // Create challenges
    console.log(`Attempting to create ${challenges.length} challenges...`);
    const createdChallenges = await Challenge.create(challenges);

    console.log(`Successfully created ${createdChallenges.length} challenges`);
    console.log('Challenge categories created:');

    // Count challenges by category
    const categories = {};
    createdChallenges.forEach(challenge => {
      if (!categories[challenge.category]) {
        categories[challenge.category] = 0;
      }
      categories[challenge.category]++;
    });

    // Log category counts
    Object.keys(categories).forEach(category => {
      console.log(`- ${category}: ${categories[category]} challenges`);
    });

    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding challenges:', error);
    console.error('Error details:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
};

// Run the seeding function
seedChallenges();
