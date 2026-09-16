import './Legal.css';
import { useSiteConfig } from '../context/SiteConfigContext';

function TermsOfService() {
  const { eventName } = useSiteConfig();

  return (
    <div className="legal-container">
      <div className="legal-header">
        <h1>Terms of <span className="highlight">Service</span></h1>
        <p className="legal-subtitle">Last Updated: {new Date().toLocaleDateString()}</p>
      </div>

      <div className="legal-content">
        <section className="legal-section">
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using the {eventName} platform, you agree to be bound by these Terms of Service and all applicable laws and regulations.
            If you do not agree with any of these terms, you are prohibited from using or accessing this site.
          </p>
        </section>

        <section className="legal-section">
          <h2>2. Use License</h2>
          <p>
            Permission is granted to temporarily access the materials on {eventName}'s website for personal, non-commercial use only.
            This is the grant of a license, not a transfer of title, and under this license you may not:
          </p>
          <ul className="legal-list">
            <li>Modify or copy the materials;</li>
            <li>Use the materials for any commercial purpose;</li>
            <li>Attempt to decompile or reverse engineer any software contained on {eventName}'s website;</li>
            <li>Remove any copyright or other proprietary notations from the materials; or</li>
            <li>Transfer the materials to another person or "mirror" the materials on any other server.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>3. User Accounts</h2>
          <p>
            When you create an account with us, you must provide information that is accurate, complete, and current at all times.
            Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our platform.
          </p>
          <p>
            You are responsible for safeguarding the password that you use to access the platform and for any activities or actions under your password.
            You agree not to disclose your password to any third party. You must notify us immediately upon becoming aware of any breach of security or unauthorized use of your account.
          </p>
        </section>

        <section className="legal-section">
          <h2>4. Ethical Conduct</h2>
          <p>
            {eventName} is designed for educational purposes and to promote ethical hacking skills. You agree to:
          </p>
          <ul className="legal-list">
            <li>Only use the skills and techniques learned on our platform for legal and ethical purposes;</li>
            <li>Not attempt to attack, exploit, or compromise any systems without explicit permission;</li>
            <li>Not share solutions to challenges publicly while competitions are active;</li>
            <li>Respect the intellectual property rights of challenge creators and other users.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>5. Disclaimer</h2>
          <p>
            The materials on {eventName}'s website are provided on an 'as is' basis. {eventName} makes no warranties, expressed or implied,
            and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability,
            fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
          </p>
        </section>

        <section className="legal-section">
          <h2>6. Limitations</h2>
          <p>
            In no event shall {eventName} or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit,
            or due to business interruption) arising out of the use or inability to use the materials on {eventName}'s website,
            even if {eventName} or a {eventName} authorized representative has been notified orally or in writing of the possibility of such damage.
          </p>
        </section>

        <section className="legal-section">
          <h2>7. Revisions and Errata</h2>
          <p>
            The materials appearing on {eventName}'s website could include technical, typographical, or photographic errors.
            {eventName} does not warrant that any of the materials on its website are accurate, complete or current.
            {eventName} may make changes to the materials contained on its website at any time without notice.
          </p>
        </section>

        <section className="legal-section">
          <h2>8. Governing Law</h2>
          <p>
            These terms and conditions are governed by and construed in accordance with the laws and any dispute relating to these terms shall be subject to the exclusive jurisdiction of the courts.
          </p>
        </section>

        <section className="legal-section">
          <h2>9. Changes to Terms</h2>
          <p>
            We reserve the right to modify these terms at any time. We will notify users of any changes by updating the date at the top of this page.
            Your continued use of the platform following the posting of revised Terms means that you accept and agree to the changes.
          </p>
        </section>
      </div>
    </div>
  );
}

export default TermsOfService;
