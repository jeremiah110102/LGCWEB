// LGC site — shared behavior

document.addEventListener('DOMContentLoaded', () => {
  const transition = document.createElement('div');
  transition.className = 'page-transition';
  transition.setAttribute('aria-hidden', 'true');
  document.body.appendChild(transition);
  window.requestAnimationFrame(() => document.body.classList.add('page-ready'));

  const shouldTransition = (link, event) => {
    if (!link || event.defaultPrevented || event.button !== 0) return false;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
    if (link.target === '_blank' || link.hasAttribute('download')) return false;
    const url = new URL(link.href, window.location.href);
    return url.origin === window.location.origin && url.pathname.endsWith('.html') && url.pathname !== window.location.pathname;
  };
  document.querySelectorAll('a[href]').forEach((link) => {
    link.addEventListener('click', (event) => {
      if (!shouldTransition(link, event)) return;
      event.preventDefault();
      document.body.classList.add('page-leaving');
      window.setTimeout(() => { window.location.href = link.href; }, 320);
    });
  });

  const progress = document.createElement('div');
  progress.className = 'scroll-progress';
  progress.setAttribute('aria-hidden', 'true');
  document.body.appendChild(progress);

  const sections = [...document.querySelectorAll('body > section')];
  sections.forEach((section) => section.classList.add('scroll-section'));
  if ('IntersectionObserver' in window) {
    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => entry.target.classList.toggle('is-current', entry.isIntersecting));
    }, { threshold: 0.35 });
    sections.forEach((section) => sectionObserver.observe(section));
  }

  let scrollTicking = false;
  const updateScrollFlow = () => {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const amount = scrollable > 0 ? window.scrollY / scrollable : 0;
    progress.style.transform = `scaleX(${Math.min(1, Math.max(0, amount))})`;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { scrollTicking = false; return; }
    document.querySelectorAll('.intro-stage__background, .hero-background').forEach((layer) => {
      const box = layer.parentElement.getBoundingClientRect();
      const offset = Math.max(-24, Math.min(24, box.top * -0.035));
      layer.style.setProperty('--scroll-offset', `${offset}px`);
    });
    scrollTicking = false;
  };
  window.addEventListener('scroll', () => {
    if (!scrollTicking) { window.requestAnimationFrame(updateScrollFlow); scrollTicking = true; }
  }, { passive: true });
  updateScrollFlow();

  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', links.classList.contains('open'));
    });
    links.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => links.classList.remove('open')));
  }

  const header = document.querySelector('.site-header');
  const updateHeader = () => header?.classList.toggle('is-scrolled', window.scrollY > 8);
  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });

  const motionOK = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const introStage = document.querySelector('.intro-stage');
  if (introStage && motionOK) {
    introStage.addEventListener('pointermove', (event) => {
      const rect = introStage.getBoundingClientRect();
      introStage.style.setProperty('--mouse-x', `${((event.clientX - rect.left) / rect.width) * 100}%`);
      introStage.style.setProperty('--mouse-y', `${((event.clientY - rect.top) / rect.height) * 100}%`);
    });
    introStage.addEventListener('pointerleave', () => {
      introStage.style.setProperty('--mouse-x', '50%');
      introStage.style.setProperty('--mouse-y', '50%');
    });
  }

  if (motionOK && window.matchMedia('(pointer: fine)').matches) {
    document.querySelectorAll('.card').forEach((card) => {
      card.addEventListener('pointermove', (event) => {
        const rect = card.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - .5;
        const y = (event.clientY - rect.top) / rect.height - .5;
        card.style.setProperty('--card-ry', `${x * 4}deg`);
        card.style.setProperty('--card-rx', `${y * -4}deg`);
      });
      card.addEventListener('pointerleave', () => {
        card.style.setProperty('--card-ry', '0deg');
        card.style.setProperty('--card-rx', '0deg');
      });
    });
  }

  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach((el) => io.observe(el));
  } else revealEls.forEach((el) => el.classList.add('is-visible'));

  // Optional homepage background image. Keep this blank to use the normal background.
  // Recommended: place the image in assets/img/ and use a relative path, for example:
  // const HOME_BACKGROUND_IMAGE = 'assets/img/campus-background.jpg';
  // You may also use a hosted image URL.
  const HOME_BACKGROUND_IMAGE = 'assets/img/campus-opening.jpg';
  const hero = document.querySelector('#homeHero');
  const intro = document.querySelector('#introStage');
  if (HOME_BACKGROUND_IMAGE) {
    hero?.querySelector('.hero-background')?.style.setProperty('background-image', `url("${HOME_BACKGROUND_IMAGE}")`);
    hero?.classList.add('has-background');
    intro?.querySelector('.intro-stage__background')?.style.setProperty('background-image', `url("${HOME_BACKGROUND_IMAGE}")`);
    intro?.classList.add('has-image');
  }

  // Campus slideshow: placeholder panels are ready for later image replacement.
  const slideshow = document.querySelector('[data-slideshow]');
  if (slideshow) {
    const slides = [...slideshow.querySelectorAll('.gallery-slide')];
    const dots = slideshow.querySelector('.gallery-dots');
    const prev = slideshow.querySelector('[data-gallery-prev]');
    const next = slideshow.querySelector('[data-gallery-next]');
    let current = 0;
    let timer;

    const syncVideoPlayback = () => {
      slides.forEach((slide, index) => {
        const video = slide.querySelector('video');
        if (!video) return;

        if (index === current) {
          video.currentTime = 0;
          const playRequest = video.play();
          playRequest?.catch(() => {});
        } else {
          video.pause();
          video.currentTime = 0;
        }
      });
    };

    slides.forEach((_, index) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = `gallery-dot${index === 0 ? ' is-active' : ''}`;
      dot.setAttribute('aria-label', `Show campus photo ${index + 1}`);
      dot.addEventListener('click', () => show(index));
      dots?.appendChild(dot);
    });

    const show = (index) => {
      current = (index + slides.length) % slides.length;
      slides.forEach((slide, i) => slide.classList.toggle('is-active', i === current));
      dots?.querySelectorAll('.gallery-dot').forEach((dot, i) => dot.classList.toggle('is-active', i === current));
      syncVideoPlayback();
      restart();
    };

    const restart = () => {
      window.clearTimeout(timer);
      const activeVideo = slides[current]?.querySelector('video');
      const duration = activeVideo ? Number(activeVideo.dataset.slideDuration) || 9000 : 5200;
      timer = window.setTimeout(() => show(current + 1), duration);
    };

    prev?.addEventListener('click', () => show(current - 1));
    next?.addEventListener('click', () => show(current + 1));
    slideshow.addEventListener('mouseenter', () => window.clearTimeout(timer));
    slideshow.addEventListener('mouseleave', restart);
    slideshow.addEventListener('focusin', () => window.clearTimeout(timer));
    slideshow.addEventListener('focusout', restart);
    syncVideoPlayback();
    restart();
  }

  // Academics program cards: open an accessible, animated course-description modal.
  const courseModal = document.querySelector('#courseModal');
  const programCards = document.querySelectorAll('.program-card');
  if (courseModal && programCards.length) {
    const dialog = courseModal.querySelector('.course-modal__dialog');
    const modalTitle = courseModal.querySelector('#courseModalTitle');
    const modalTag = courseModal.querySelector('#courseModalTag');
    const modalDescription = courseModal.querySelector('#courseModalDescription');
    const flyerWrap = courseModal.querySelector('#courseModalFlyerWrap');
    const flyerImage = courseModal.querySelector('#courseModalFlyer');
    let flyerPrev = courseModal.querySelector('#courseModalFlyerPrev');
    let flyerNext = courseModal.querySelector('#courseModalFlyerNext');
    let flyerDots = courseModal.querySelector('#courseModalFlyerDots');
    const closeButtons = courseModal.querySelectorAll('[data-modal-close]');
    let lastFocused;
    let currentFlyers = [];
    let currentFlyerIndex = 0;

    if (flyerWrap && flyerImage) {
      if (!flyerPrev) {
        flyerPrev = document.createElement('button');
        flyerPrev.type = 'button';
        flyerPrev.id = 'courseModalFlyerPrev';
        flyerPrev.className = 'course-modal__flyer-arrow course-modal__flyer-prev';
        flyerPrev.setAttribute('aria-label', 'Previous flyer photo');
        flyerPrev.textContent = '←';
        flyerWrap.appendChild(flyerPrev);
      }
      if (!flyerNext) {
        flyerNext = document.createElement('button');
        flyerNext.type = 'button';
        flyerNext.id = 'courseModalFlyerNext';
        flyerNext.className = 'course-modal__flyer-arrow course-modal__flyer-next';
        flyerNext.setAttribute('aria-label', 'Next flyer photo');
        flyerNext.textContent = '→';
        flyerWrap.appendChild(flyerNext);
      }
      if (!flyerDots) {
        flyerDots = document.createElement('div');
        flyerDots.id = 'courseModalFlyerDots';
        flyerDots.className = 'course-modal__flyer-dots';
        flyerDots.setAttribute('aria-label', 'Choose flyer photo');
        flyerWrap.appendChild(flyerDots);
      }
    }
    const descriptions = {
      'BS Pharmacy': 'This program introduces the science of medicines, patient-centered pharmaceutical care, and the professional responsibilities involved in supporting safe and effective treatment.',
      'BS Nursing': 'This program develops foundational knowledge and practical skills for compassionate nursing care, health promotion, clinical teamwork, and lifelong professional learning.',
      'BS Medical Technology': 'This program explores laboratory science, diagnostic testing, specimen handling, and the careful analytical work that supports healthcare decisions.',
      'BS Radiologic Technology': 'This program introduces diagnostic imaging practice, patient preparation, radiation safety, and the technical discipline required in radiologic services.',
      'BS Midwifery': 'This program focuses on maternal and newborn care, reproductive health, community service, and the supportive role of midwives throughout the birthing journey.',
      'BS Nutrition & Dietetics': 'This program explores nutrition science, food systems, wellness planning, and the development of practical dietary guidance for individuals and communities.',
      'BS Criminology': 'This program examines crime prevention, public safety, justice systems, investigation, and the ethical responsibilities of professionals serving communities.',
      'BS Social Work': 'This program develops skills in human services, community engagement, case support, advocacy, and compassionate responses to social concerns.',
      'Bachelor of Elementary Education': 'This program prepares future elementary educators to design meaningful learning experiences, support diverse learners, and build strong foundations in literacy and numeracy.',
      'Diploma in Midwifery (Ladderized in BS in Midwifery)': 'This two-year pathway introduces essential midwifery knowledge and skills, with a ladderized route for continued study toward a bachelor’s degree.',
      'Healthcare Services (Nursing Aide)': 'This one-year course introduces the fundamentals of patient assistance, basic care routines, communication, safety, and teamwork in healthcare settings.',
      'Caregi': 'This short course introduces essential caregiving skills, personal support, safe daily routines, and compassionate service for people who need assistance.',
      '(STEM, GAS, TVL, HUMSS, ABM)': 'Senior High School gives learners a strong academic and practical foundation through strand options designed to support further study, career preparation, and personal growth.',
      'Junior High School': 'Junior High School builds confidence across core subjects while strengthening curiosity, responsibility, collaboration, and readiness for senior high school.',
      'Elementary': 'Elementary education nurtures foundational knowledge, creativity, character, and the learning habits students carry into the next stages of their education.',
      'Kindergarten': 'Kindergarten provides a welcoming first step into formal learning through play, routines, social development, early literacy, and early numeracy.'
    };
    // Code-only flyer configuration. Place flyer images in assets/img/flyers/
    // and replace an empty value with a relative path, for example:
    // 'BS Pharmacy': 'assets/img/flyers/bs-pharmacy.jpg',
    const flyerImages = {
  'BS Pharmacy': [
    'assets/img/flyers/BSPH 1.png',
    'assets/img/flyers/BSPH 2 NEW.png'
  ],

  'BS Nursing': [
    'assets/img/flyers/bsn flyers 1.png',
    'assets/img/flyers/bsn flyers.png'
  ],

  'BS Medical Technology': [],

  'BS Radiologic Technology': [],

  'BS Midwifery': [
    'assets/img/flyers/MIDWIFERY - Front Page.jpg',
    'assets/img/flyers/MIDWIFERY - Inner Page.jpg'
  ],

  'BS Nutrition & Dietetics': [
    'assets/img/flyers/BSND NEW 1.jpg',
    'assets/img/flyers/BSND NEW 2.jpg'
  ],

  'BS Criminology': [
    'assets/img/flyers/CRIMI NEW PG1.jpg',
    'assets/img/flyers/CRIMI NEW PG2.jpg'
  ],

  'BS Social Work': [],

  'Bachelor of Elementary Education': [
    'assets/img/flyers/EDUC NEW PG 1.jpg',
    'assets/img/flyers/EDUC NEW PG 2.jpg'
  ],

  'Diploma in Midwifery (Ladderized in BS in Midwifery)': [],
  'Healthcare Services (Nursing Aide)': [],
  'Caregi': [],
  '(STEM, GAS, TVL, HUMSS, ABM)': [],
  'Junior High School': [],
  'Elementary': [],
  'Kindergarten': []
};


    const getText = (card, selector) => card.querySelector(selector)?.textContent.replace(/\s+/g, ' ').trim() || '';
    const renderFlyer = () => {
      if (!flyerImage || !currentFlyers.length) return;
      flyerImage.src = currentFlyers[currentFlyerIndex];
      flyerImage.alt = `${modalTitle.textContent} flyer ${currentFlyerIndex + 1}`;
      const hasMultiple = currentFlyers.length > 1;
      if (flyerPrev) flyerPrev.hidden = !hasMultiple;
      if (flyerNext) flyerNext.hidden = !hasMultiple;
      if (flyerDots) {
        flyerDots.innerHTML = '';
        flyerDots.hidden = !hasMultiple;
        currentFlyers.forEach((_, index) => {
          const dot = document.createElement('button');
          dot.type = 'button';
          dot.className = `course-modal__flyer-dot${index === currentFlyerIndex ? ' is-active' : ''}`;
          dot.setAttribute('aria-label', `Show flyer photo ${index + 1}`);
          dot.addEventListener('click', () => {
            currentFlyerIndex = index;
            renderFlyer();
          });
          flyerDots.appendChild(dot);
        });
      }
    };
    const openModal = (card) => {
      lastFocused = document.activeElement;
      const title = getText(card, 'h3');
      const tag = getText(card, '.tag');
      modalTitle.textContent = title;
      modalTag.textContent = tag || 'Program details';
      modalDescription.textContent = descriptions[title] || 'Course description details will be added here. Please contact admissions for the latest information about this program.';
      const configuredFlyers = flyerImages[title] || [];
      currentFlyers = Array.isArray(configuredFlyers)
        ? configuredFlyers.filter(Boolean)
        : [configuredFlyers].filter(Boolean);
      currentFlyerIndex = 0;
      dialog?.classList.toggle('has-flyer', currentFlyers.length > 0);
      if (flyerWrap && flyerImage && currentFlyers.length) {
        flyerWrap.hidden = false;
        flyerWrap.classList.add('is-visible');
        renderFlyer();
      } else if (flyerWrap && flyerImage) {
        flyerImage.removeAttribute('src');
        flyerImage.alt = '';
        flyerWrap.hidden = true;
        flyerWrap.classList.remove('is-visible');
        if (flyerDots) {
          flyerDots.innerHTML = '';
          flyerDots.hidden = true;
        }
      }
      courseModal.classList.add('is-open');
      courseModal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('modal-open');
      window.setTimeout(() => dialog?.focus(), 40);
    };
    const closeModal = () => {
      courseModal.classList.remove('is-open');
      courseModal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('modal-open');
      lastFocused?.focus?.();
    };
    programCards.forEach((card) => {
      card.addEventListener('click', () => openModal(card));
      card.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openModal(card); }
      });
    });
    flyerImage?.addEventListener('error', () => {
      flyerImage.removeAttribute('src');
      flyerWrap?.classList.remove('is-visible');
      if (flyerPrev) flyerPrev.hidden = true;
      if (flyerNext) flyerNext.hidden = true;
      if (flyerDots) flyerDots.hidden = true;
    });
    flyerPrev?.addEventListener('click', () => {
      if (!currentFlyers.length) return;
      currentFlyerIndex = (currentFlyerIndex - 1 + currentFlyers.length) % currentFlyers.length;
      renderFlyer();
    });
    flyerNext?.addEventListener('click', () => {
      if (!currentFlyers.length) return;
      currentFlyerIndex = (currentFlyerIndex + 1) % currentFlyers.length;
      renderFlyer();
    });
    closeButtons.forEach((button) => button.addEventListener('click', closeModal));
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && courseModal.classList.contains('is-open')) closeModal();
    });
  }

});
