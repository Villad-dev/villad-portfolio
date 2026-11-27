import gsapModule from 'gsap';

const gsap = window.gsap || gsapModule;

/**
 * Smooth entrance animation for UI overlay elements once 3D scene finishes loading.
 */
export function animateUIOnLoad() {
  const navbar = document.querySelector('.navbar');
  const hudFooter = document.getElementById('hud-footer');

  if (!gsap) {
    if (navbar) navbar.style.opacity = '1';
    if (hudFooter) hudFooter.style.opacity = '1';
    return;
  }

  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

  if (navbar) {
    tl.fromTo(
      navbar,
      { opacity: 0, y: -16 },
      { opacity: 1, y: 0, duration: 0.8, delay: 0.2 }
    );
  }

  if (hudFooter) {
    tl.fromTo(
      hudFooter,
      { opacity: 0, y: 16 },
      { opacity: 1, y: 0, duration: 0.8 },
      '-=0.5'
    );
  }
}
