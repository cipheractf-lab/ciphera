const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Blog = require('../models/Blog');

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('MongoDB Connected'))
.catch(err => {
  console.error('MongoDB Connection Error:', err);
  process.exit(1);
});

// Sample blog posts data
const blogPosts = [
  {
    title: 'Understanding Cross-Site Scripting (XSS) Attacks',
    content: `Cross-Site Scripting (XSS) remains one of the most prevalent web security vulnerabilities in 2023. This attack vector allows malicious actors to inject client-side scripts into web pages viewed by other users, potentially leading to session hijacking, credential theft, and other serious security breaches.

In this comprehensive guide, we'll explore the three main types of XSS attacks:

1. **Stored XSS**: The most dangerous form, where the malicious script is permanently stored on the target server (in a database, message forum, comment field, etc.) and then served to other users who visit the affected page.

2. **Reflected XSS**: Occurs when the malicious script is reflected off a web server, such as in search results or error messages that include user-supplied data, without proper sanitization.

3. **DOM-based XSS**: Takes place entirely within the browser when client-side JavaScript modifies the Document Object Model (DOM) environment unsafely.

### Real-World Impact

The consequences of XSS vulnerabilities can be severe. In 2018, British Airways suffered a major data breach through an XSS attack that compromised payment information of approximately 380,000 customers. More recently, in 2022, a stored XSS vulnerability in a popular e-commerce platform allowed attackers to steal credit card information from thousands of online stores.

### Prevention Techniques

To protect your web applications from XSS attacks, implement these essential security measures:

- **Input Validation**: Validate all user inputs on the server side before processing or storing them.
- **Output Encoding**: Encode user-supplied data before rendering it in HTML, JavaScript, CSS, or URL contexts.
- **Content Security Policy (CSP)**: Implement strict CSP headers to restrict the sources from which scripts can be loaded.
- **Use Modern Frameworks**: Many modern JavaScript frameworks like React, Angular, and Vue automatically escape content, reducing XSS risks.
- **Regular Security Audits**: Conduct thorough security assessments to identify and remediate potential XSS vulnerabilities.

In our next blog post, we'll provide hands-on examples of how to identify and exploit XSS vulnerabilities in CTF challenges, along with detailed remediation strategies.

Stay secure!`,
    category: 'Web Security',
    author: 'Sarah Johnson',
    externalLink: 'https://portswigger.net/web-security/cross-site-scripting',
    createdAt: new Date('2023-09-15')
  },
  {
    title: 'Mastering Buffer Overflow Exploitation',
    content: `Buffer overflows have been a fundamental security vulnerability for decades, yet they continue to plague software systems today. Understanding how to identify and exploit buffer overflows is essential for both offensive security professionals and defenders.

A buffer overflow occurs when a program writes more data to a buffer than it can hold, causing the excess data to overflow into adjacent memory space. This can lead to program crashes, data corruption, or even arbitrary code execution.

### The Anatomy of a Buffer Overflow

At its core, a buffer overflow exploitation involves several key components:

1. **Vulnerable Function**: Functions like strcpy(), gets(), and sprintf() in C/C++ that don't perform bounds checking.
2. **Buffer Space**: The allocated memory that will be overflowed.
3. **Return Address**: The memory address that controls program execution flow.
4. **Shellcode**: The malicious payload that the attacker wants to execute.

### Exploitation Process

The typical exploitation process follows these steps:

1. **Identify the vulnerability**: Find a program that uses vulnerable functions without proper bounds checking.
2. **Determine the buffer size**: Use techniques like pattern generation to find the exact offset needed to reach the return address.
3. **Locate or create a suitable shellcode**: Develop or obtain shellcode appropriate for the target system.
4. **Bypass protections**: Modern systems implement protections like ASLR, DEP, and stack canaries that must be circumvented.
5. **Deliver the exploit**: Craft an input that overflows the buffer, overwrites the return address, and executes the shellcode.

### Real-World Example: The Morris Worm

One of the earliest and most infamous examples of buffer overflow exploitation was the Morris Worm in 1988, which exploited a buffer overflow in the Unix finger protocol. This worm affected approximately 10% of all computers connected to the Internet at that time, highlighting the devastating potential of this vulnerability.

### Prevention Techniques

To protect against buffer overflow vulnerabilities:

- **Use memory-safe languages**: Languages like Rust, Go, or Python that handle memory management automatically.
- **Implement bounds checking**: Always validate input lengths before copying data into buffers.
- **Employ compiler protections**: Enable stack canaries, ASLR, and DEP.
- **Conduct regular code reviews**: Focus on identifying unsafe memory operations.
- **Use static and dynamic analysis tools**: Tools like AddressSanitizer can detect memory corruption bugs.

In our upcoming CTF challenges, we'll provide hands-on opportunities to practice buffer overflow exploitation in a controlled environment. Stay tuned for practical exercises that will help you master this critical security skill.`,
    category: 'Binary Exploitation',
    author: 'Michael Chen',
    externalLink: 'https://owasp.org/www-community/vulnerabilities/Buffer_Overflow',
    createdAt: new Date('2023-10-02')
  },
  {
    title: 'Cryptographic Attacks: Breaking Weak Encryption',
    content: `Cryptography forms the backbone of digital security, but not all cryptographic implementations are created equal. In this post, we'll explore common cryptographic vulnerabilities and how they're exploited in CTF challenges and real-world scenarios.

### Weak Key Generation

Many cryptographic systems fail due to predictable or weak key generation. For example, in 2008, researchers discovered that some SSL certificates were using predictable random number generators, making it possible to forge certificates. Similarly, Bitcoin wallets generated with insufficient entropy have been compromised, leading to theft of funds.

### Common Cryptographic Attacks

1. **Frequency Analysis**: Used to break simple substitution ciphers by analyzing the frequency of characters in the ciphertext.

2. **Known Plaintext Attack**: When an attacker has samples of both plaintext and its corresponding ciphertext, they can work backward to determine the encryption key.

3. **Chosen Plaintext Attack**: The attacker can choose arbitrary plaintext and obtain its encrypted version, using the results to deduce the key.

4. **Side-Channel Attacks**: These exploit information gained from the physical implementation of a cryptosystem, such as timing information, power consumption, or electromagnetic leaks.

5. **Birthday Attack**: Exploits the mathematics behind the birthday paradox to find collisions in hash functions more efficiently than brute force methods.

### Case Study: The Padding Oracle Attack

The padding oracle attack is particularly interesting for CTF enthusiasts. This attack targets the padding validation in CBC-mode encryption, allowing attackers to decrypt ciphertext without knowing the key. By sending modified ciphertexts to a server and observing whether it returns a padding error, an attacker can systematically decrypt the message.

This vulnerability affected many real-world systems, including ASP.NET, Java Server Faces, and Ruby on Rails, before patches were implemented.

### Practical Defense Strategies

To protect cryptographic implementations:

- **Use standard, well-vetted cryptographic libraries**: Don't implement cryptography yourself.
- **Keep cryptographic systems updated**: Many vulnerabilities are discovered and patched over time.
- **Implement proper key management**: Generate keys with sufficient entropy and rotate them regularly.
- **Use authenticated encryption**: AEAD modes like GCM provide both confidentiality and integrity.
- **Be aware of side-channel vulnerabilities**: Consider timing attacks and other non-cryptographic weaknesses.

In our upcoming CTF challenges, you'll have the opportunity to practice breaking various cryptographic systems, from classical ciphers to modern encryption with implementation flaws. These hands-on exercises will deepen your understanding of both offensive and defensive cryptography.`,
    category: 'Cryptography',
    author: 'Elena Rodriguez',
    externalLink: 'https://cryptopals.com/',
    createdAt: new Date('2023-10-20')
  },
  {
    title: 'Digital Forensics: Uncovering Hidden Evidence',
    content: `Digital forensics is the art and science of discovering, analyzing, and preserving electronic evidence. Whether you're participating in CTF competitions or pursuing a career in cybersecurity, forensic skills are invaluable for uncovering hidden information and solving complex challenges.

### The Forensic Process

A systematic approach to digital forensics typically follows these steps:

1. **Acquisition**: Creating a forensically sound copy of the digital evidence without altering the original data.
2. **Preservation**: Maintaining the integrity of the evidence through proper handling and documentation.
3. **Analysis**: Examining the evidence to identify relevant information and artifacts.
4. **Documentation**: Recording findings and methodologies used during the investigation.
5. **Presentation**: Communicating findings in a clear, concise manner.

### Essential Forensic Techniques

#### File Carving

File carving is the process of extracting files from a disk image or memory dump without relying on file system metadata. This technique is crucial when dealing with deleted files, corrupted file systems, or hidden data. Tools like Foremost, Scalpel, and PhotoRec can identify file signatures (magic numbers) and extract files even when their metadata is missing or damaged.

#### Memory Forensics

Memory forensics involves analyzing the volatile memory (RAM) of a system to uncover evidence that wouldn't be available on disk, such as running processes, network connections, and encryption keys. The Volatility Framework has become the standard tool for memory forensics, allowing investigators to extract valuable information from memory dumps.

#### Metadata Analysis

Files contain hidden metadata that can reveal crucial information about their origin and history. For example, EXIF data in images can include GPS coordinates, camera information, and timestamps. Tools like ExifTool can extract and analyze this metadata, often revealing more than the file creator intended.

#### Steganography Detection

Steganography is the practice of hiding data within other non-secret data or a physical object. In digital forensics, this often involves detecting and extracting information hidden within images, audio files, or other media. Tools like Stegdetect, Stegsolve, and Binwalk can help identify and extract steganographically hidden data.

### Real-World Applications

Digital forensics plays a crucial role in:

- **Criminal Investigations**: Recovering evidence from digital devices in cases ranging from fraud to terrorism.
- **Corporate Investigations**: Examining data breaches, intellectual property theft, and employee misconduct.
- **Incident Response**: Determining the scope and impact of security incidents.
- **Data Recovery**: Retrieving lost or deleted information from damaged or corrupted storage media.

### Ethical Considerations

Digital forensics practitioners must adhere to strict ethical guidelines, including:

- Maintaining the integrity of evidence
- Working within legal boundaries
- Respecting privacy concerns
- Providing objective, unbiased analysis

In our upcoming CTF challenges, you'll have the opportunity to apply these forensic techniques to solve increasingly complex scenarios. From recovering deleted files to extracting hidden messages from images, these challenges will help you develop the analytical mindset essential for successful digital forensics.`,
    category: 'Digital Forensics',
    author: 'James Wilson',
    externalLink: 'https://www.sans.org/digital-forensics/',
    createdAt: new Date('2023-11-05')
  },
  {
    title: 'Getting Started with CTF Competitions: A Beginner\'s Guide',
    content: `Capture The Flag (CTF) competitions have become the cornerstone of cybersecurity education and skill development. These gamified challenges provide a hands-on approach to learning security concepts, from web exploitation to cryptography. If you're new to the world of CTFs, this guide will help you get started on your journey.

### What is a CTF?

CTF competitions are security contests where participants solve cybersecurity challenges to find hidden "flags" - typically strings of text in a specific format (like CTF{flag_text_here}). These flags, when submitted, earn points for the player or team. Competitions can be jeopardy-style (with categories of challenges) or attack-defense (where teams protect their systems while attacking others).

### Common CTF Categories

1. **Web Exploitation**: Challenges involving web application vulnerabilities like SQL injection, XSS, CSRF, and more.
2. **Cryptography**: Puzzles requiring the breaking or analysis of encryption algorithms and protocols.
3. **Binary Exploitation**: Tasks involving buffer overflows, return-oriented programming, and other memory corruption vulnerabilities.
4. **Reverse Engineering**: Challenges that require understanding compiled code to determine its functionality.
5. **Forensics**: Problems involving the analysis of data to uncover hidden information or reconstruct events.
6. **OSINT (Open Source Intelligence)**: Challenges that test your ability to gather information from publicly available sources.
7. **Miscellaneous**: A catch-all category for challenges that don't fit elsewhere, often involving general problem-solving skills.

### Essential Tools for CTF Participants

#### Web Exploitation
- **Burp Suite**: For intercepting and modifying web requests
- **OWASP ZAP**: An alternative to Burp Suite with similar functionality
- **Firefox Developer Tools**: For inspecting and debugging web pages

#### Cryptography
- **CyberChef**: A web app for encryption, encoding, compression, and data analysis
- **Hashcat/John the Ripper**: For password cracking
- **PyCryptodome**: A Python library for cryptographic operations

#### Binary Exploitation & Reverse Engineering
- **Ghidra**: NSA's reverse engineering tool
- **IDA Pro/Radare2**: Disassemblers and debuggers
- **GDB/PEDA**: Debugging tools for analyzing binary execution

#### Forensics
- **Wireshark**: For network packet analysis
- **Volatility**: For memory forensics
- **Autopsy/Sleuth Kit**: For disk image analysis
- **ExifTool**: For metadata extraction

### Tips for Beginners

1. **Start with beginner-friendly CTFs**: Platforms like picoCTF, CTFlearn, and TryHackMe offer challenges designed for newcomers.
2. **Focus on one category initially**: Master the basics in one area before expanding your skills.
3. **Document your process**: Keep notes on techniques, tools, and solutions for future reference.
4. **Join a community**: Discord servers, Reddit communities, and local meetups can provide support and learning opportunities.
5. **Practice regularly**: Consistent practice is key to improving your skills.
6. **Don't be afraid to use hints**: Learning is the primary goal, especially when starting out.
7. **Review write-ups**: After a competition, read write-ups to learn alternative approaches to challenges you struggled with.

### Learning Resources

- **CTF Platforms**: picoCTF, CTFtime, HackTheBox, TryHackMe
- **YouTube Channels**: LiveOverflow, John Hammond, IppSec
- **Books**: "The Web Application Hacker's Handbook," "Practical Malware Analysis," "Real-World Bug Hunting"
- **Online Courses**: Offensive Security's OSCP, SANS courses, Udemy cybersecurity courses

### Your First CTF

Ready to dive in? Start with our beginner challenges here on pwngrid Horizon! Our platform offers a range of difficulty levels, allowing you to progress at your own pace. Remember, the goal is not just to capture flags but to understand the underlying concepts and techniques.

Happy hacking, and welcome to the exciting world of CTF competitions!`,
    category: 'CTF Basics',
    author: 'Alex Thompson',
    externalLink: 'https://ctftime.org/',
    createdAt: new Date('2023-11-15')
  }
];

// Function to seed blog posts
const seedBlogPosts = async () => {
  try {
    // Clear existing blog posts
    await Blog.deleteMany();
    console.log('Cleared existing blog posts');

    // Create blog posts
    const createdPosts = await Blog.create(blogPosts);

    console.log(`Created ${createdPosts.length} blog posts`);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding blog posts:', error);
    process.exit(1);
  }
};

// Run the seeding function
seedBlogPosts();
