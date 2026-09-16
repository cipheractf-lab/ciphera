import './Legal.css';
import { useSiteConfig } from '../context/SiteConfigContext';

function PrivacyPolicy() {
  const { eventName } = useSiteConfig();

  return (
    <div className="legal-container">
      <div className="legal-header">
        <h1>Privacy <span className="highlight">Policy</span></h1>
        <p className="legal-subtitle">Last Updated: {new Date().toLocaleDateString()}</p>
      </div>

      <div className="legal-content">
        <section className="legal-section">
          <h2>1. Introduction</h2>
          <p>
            Welcome to {eventName}. We respect your privacy and are committed to protecting your personal data.
            This privacy policy will inform you about how we look after your personal data when you visit our website
            and tell you about your privacy rights and how the law protects you.
          </p>
        </section>

        <section className="legal-section">
          <h2>2. Data We Collect</h2>
          <p>
            We may collect, use, store and transfer different kinds of personal data about you which we have grouped together as follows:
          </p>
          <ul className="legal-list">
            <li><strong>Identity Data</strong> includes username, email address.</li>
            <li><strong>Technical Data</strong> includes internet protocol (IP) address, browser type and version, time zone setting and location, operating system and platform, and other technology on the devices you use to access this website.</li>
            <li><strong>Usage Data</strong> includes information about how you use our website, challenges attempted, and challenges solved.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>3. How We Use Your Data</h2>
          <p>
            We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:
          </p>
          <ul className="legal-list">
            <li>To register you as a new user.</li>
            <li>To manage our relationship with you.</li>
            <li>To enable you to participate in CTF challenges.</li>
            <li>To administer and protect our platform.</li>
            <li>To use data analytics to improve our website, challenges, user experience, and services.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>4. Data Security</h2>
          <p>
            We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used, or accessed in an unauthorized way, altered, or disclosed. 
            In addition, we limit access to your personal data to those employees, agents, contractors, and other third parties who have a business need to know.
          </p>
        </section>

        <section className="legal-section">
          <h2>5. Data Retention</h2>
          <p>
            We will only retain your personal data for as long as necessary to fulfill the purposes we collected it for, 
            including for the purposes of satisfying any legal, accounting, or reporting requirements.
          </p>
        </section>

        <section className="legal-section">
          <h2>6. Your Legal Rights</h2>
          <p>
            Under certain circumstances, you have rights under data protection laws in relation to your personal data, including the right to:
          </p>
          <ul className="legal-list">
            <li>Request access to your personal data.</li>
            <li>Request correction of your personal data.</li>
            <li>Request erasure of your personal data.</li>
            <li>Object to processing of your personal data.</li>
            <li>Request restriction of processing your personal data.</li>
            <li>Request transfer of your personal data.</li>
            <li>Right to withdraw consent.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}

export default PrivacyPolicy;
