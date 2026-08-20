/* Shared footer for all standalone LGC public pages. Edit it here to update every page. */
document.addEventListener("DOMContentLoaded", () => {
  const sharedFooter = `
    <div class="wrap">
      <div class="footer-grid">
        <div>
          <div class="footer-brand"><img src="assets/img/lgc-logo-transparent.png" alt="LGC seal"><b>LGC</b></div>
          <p style="font-size:14.5px; max-width:280px;">Luna Goco Colleges, Inc. — J.P. Rizal Street, Lalud, Calapan City, Oriental Mindoro, Philippines. Forming graduates in scholarship, character, and service since 1998.</p>
          <div class="social-row" style="margin-top:20px;"><a href="https://www.facebook.com/share/1DK3ERcShc/?mibextid=wwXIfr" aria-label="Facebook">f</a></div>
        </div>
        <div><h4>College</h4><ul><li><a href="about.html">About LGC</a></li><li><a href="academics.html">Academics</a></li><li><a href="news.html">News &amp; events</a></li><li><a href="contact.html">Contact</a></li></ul></div>
        <div><h4>Admissions</h4><ul><li><a href="admissions.html">How to apply</a></li><li><a href="admissions.html#requirements">Requirements</a></li><li><a href="admissions.html#tuition">Tuition &amp; aid</a></li><li><a href="contact.html">Talk to admissions</a></li></ul></div>
        <div><h4>Visit</h4><ul><li>Lalud, Calapan City</li><li>Oriental Mindoro, 5200</li><li>Mon–Sat, 8:00 AM–5:00 PM</li><li><a href="mailto:info@lgc.edu.ph">info@lgc.edu.ph</a></li></ul></div>
      </div>
      <div class="footer-bottom"><span><a class="local-admin-link" href="/admin">Admin sign in</a></span><span>© 2026 Luna Goco Colleges, Inc. All rights reserved.</span><span>© Angelo Morante, Josua Ronald Ramiento, Jeremiah Macailao | Front-end Developer</span></div>
    </div>`;

  document.querySelectorAll(".site-footer").forEach((footer) => { footer.innerHTML = sharedFooter; });
});
