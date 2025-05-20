// eternal-script.js - Enhanced v2.8
(function() {
    'use strict';

    document.documentElement.classList.remove('no-js');
    document.documentElement.classList.add('js-enabled');

    function scrollToElement(elementId, blockPosition = 'start') {
        const targetElement = document.getElementById(elementId);
        if (targetElement) {
            targetElement.scrollIntoView({
                behavior: 'smooth',
                block: blockPosition
            });
            // Set focus for accessibility after scrolling
            const oldTabIndex = targetElement.getAttribute('tabindex');
            if (oldTabIndex === null) { // Only add tabindex if it wasn't there
                targetElement.setAttribute('tabindex', -1);
                targetElement.addEventListener('blur', () => {
                    if (targetElement.getAttribute('tabindex') === '-1') {
                        targetElement.removeAttribute('tabindex');
                    }
                }, { once: true });
            }
            targetElement.focus({ preventScroll: true }); // preventScroll helps if focus itself triggers another scroll
        } else {
            console.warn(`Element with ID "${elementId}" not found for scrolling.`);
        }
    }


    function enableSmoothScroll(selector) {
        const links = document.querySelectorAll(selector);
        links.forEach(link => {
            link.addEventListener('click', function(e) {
                const href = this.getAttribute('href');
                if (href && href.startsWith('#')) {
                    e.preventDefault();
                    const targetId = href.substring(1);
                    if (targetId) {
                        scrollToElement(targetId);
                    } else if (href === "#") { // Link is just "#"
                         window.scrollTo({ top: 0, behavior: 'smooth'});
                         document.body.focus({preventScroll:true});
                    }
                }
            });
        });
    }

    function initSkipLink() {
        const skipLink = document.querySelector('.skip-link');
        const mainContent = document.getElementById('main-content');
        if (skipLink && mainContent) {
            skipLink.addEventListener('click', function(e) {
                e.preventDefault();
                scrollToElement('main-content');
            });
        } else {
            if (!skipLink) console.warn("Skip link element not found.");
            if (!mainContent) console.warn("Main content element not found for skip link.");
        }
    }

    function initTocActiveState() {
        const tocLinks = document.querySelectorAll('.toc-navigation .toc-link');
        const sections = [];
        tocLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href && href.startsWith('#')) {
                const targetId = href.substring(1);
                const section = document.getElementById(targetId);
                if (section) {
                    sections.push({link: link, section: section});
                }
            }
        });

        if(sections.length === 0) return;
        let lastActiveLink = null;

        const observerCallback = entries => {
            let isAnyIntersecting = false;
            entries.forEach(entry => {
                const correspondingLink = sections.find(s => s.section === entry.target)?.link;
                if (correspondingLink) {
                    if (entry.isIntersecting && entry.intersectionRatio > 0.1) {
                        if (lastActiveLink) lastActiveLink.classList.remove('active');
                        correspondingLink.classList.add('active');
                        lastActiveLink = correspondingLink;
                        isAnyIntersecting = true;
                    } else {
                        correspondingLink.classList.remove('active');
                        if (lastActiveLink === correspondingLink) lastActiveLink = null;
                    }
                }
            });
            if (!isAnyIntersecting && window.scrollY > 100) {
                let closestSection = null;
                let smallestDistance = Infinity;
                const viewportMidY = window.scrollY + (window.innerHeight / 2);

                sections.forEach(item => {
                    const sectionTop = item.section.offsetTop;
                    const distance = Math.abs(sectionTop - viewportMidY);
                    if (sectionTop <= viewportMidY && distance < smallestDistance) {
                        smallestDistance = distance;
                        closestSection = item;
                    }
                });
                if(!closestSection && sections.length > 0 && window.scrollY < sections[0].section.offsetTop){
                     closestSection = sections[0];
                }

                if (closestSection && closestSection.link !== lastActiveLink) {
                    if(lastActiveLink) lastActiveLink.classList.remove('active');
                    closestSection.link.classList.add('active');
                    lastActiveLink = closestSection.link;
                }
            } else if (!isAnyIntersecting && window.scrollY <= 100 && sections.length > 0 && sections[0].link !== lastActiveLink) {
                if(lastActiveLink) lastActiveLink.classList.remove('active');
                sections[0].link.classList.add('active');
                lastActiveLink = sections[0].link;
            }
        };
        const observerOptions = {
            rootMargin: "-20% 0px -50% 0px",
            threshold: 0.1
        };
        const observer = new IntersectionObserver(observerCallback, observerOptions);
        sections.forEach(item => observer.observe(item.section));
    }

    function initLivingArchiveDetailsLink() {
        const livingArchiveLink = document.getElementById('living-archive-details-link');
        if (livingArchiveLink) {
            livingArchiveLink.addEventListener('click', function(e) {
                e.preventDefault();
                console.log("Conceptual link for Living Archive details clicked (Vishwa Samvidhan).");
                alert("This link is conceptual for the Vishwa Samvidhan document.\n\nIn a fully developed system, this would lead to detailed information regarding Abstract Semantic Language (ASL), long-term physical/digital preservation protocols, and the broader vision for the Living Archive designed for multi-millennial endurance.");
            });
        }
    }

    document.body.addEventListener('mousedown', () => {
        document.body.classList.remove('using-keyboard');
    }, true);
    document.body.addEventListener('keydown', (event) => {
        if (['Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' '].includes(event.key)) {
            document.body.classList.add('using-keyboard');
        }
    }, true);

    // --- Google Translate Functionality ---
    let translateLoaded = false;
    const showHtmlTranslate = 'Experience in your mother tongue <span class="emoji-pulse">😮</span><span class="emoji-spin">🌍</span>';
    const hideHtmlTranslate = 'Hide Translation <span class="emoji-spin">🌍</span><span class="emoji-pulse">❌</span>';
    const loadingHtmlTranslate = 'Loading Translation... <span class="emoji-sandclock">⌛</span>';
    const errorHtmlTranslate = 'Translate Error <span class="emoji-pulse">⚠️</span>';

    window.googleTranslateElementInit = function() {
        console.log('Google Translate Element Initializing for Vishwa Samvidhan...');
        try {
          const newIncludedLanguages = 'en,hi,es,ar,fr,zh-CN,ru,de,bn,pt,ja,ur,ta,pa,ko,it,tr,nl,id,vi,th,ml,te,mr,gu,kn,la,sa';

          new google.translate.TranslateElement({
            pageLanguage: 'en',
            includedLanguages: newIncludedLanguages,
            layout: google.translate.TranslateElement.InlineLayout.SIMPLE,
            autoDisplay: false
          }, 'google_translate_element');
          console.log('Google Translate Element Initialized for Vishwa Samvidhan.');

          const widgetDiv = document.getElementById('google_translate_element');
          const translateButton = document.getElementById('translateBtn');
          let observerTimeout;

          const observer = new MutationObserver((mutations, obs) => {
            if (widgetDiv && widgetDiv.children.length > 0 && widgetDiv.querySelector('.goog-te-gadget-simple')) {
              console.log('Google Translate widget DOM rendered for Vishwa Samvidhan.');
              translateLoaded = true;
              obs.disconnect();
              clearTimeout(observerTimeout);

              if (translateButton) {
                translateButton.disabled = false;
                if (translateButton.innerHTML.includes('<span class="emoji-sandclock">')) {
                  translateButton.innerHTML = hideHtmlTranslate;
                  widgetDiv.style.display = 'flex';
                  translateButton.setAttribute('aria-expanded', 'true');
                  widgetDiv.setAttribute('aria-hidden', 'false');
                } else {
                   widgetDiv.style.display = 'none';
                   widgetDiv.setAttribute('aria-hidden', 'true');
                   translateButton.setAttribute('aria-expanded', 'false');
                    if (!translateButton.innerHTML.includes(hideHtmlTranslate.substring(0,20))) { // Check a substring to avoid emoji issues
                         translateButton.innerHTML = showHtmlTranslate;
                    }
                }
              } else { console.warn('#translateBtn not found after GTranslate widget init.'); }
            }
          });

          observerTimeout = setTimeout(() => {
              if (!translateLoaded) {
                  console.warn('GTranslate widget did not render in time.');
                  const btn = document.getElementById('translateBtn');
                  if (btn) {
                       if(btn.innerHTML.includes('<span class="emoji-sandclock">')) {
                           btn.innerHTML = errorHtmlTranslate;
                       } else if (!btn.innerHTML.includes(hideHtmlTranslate.substring(0,20))) {
                            btn.innerHTML = showHtmlTranslate;
                       }
                       btn.disabled = false;
                       btn.setAttribute('aria-expanded', 'false');
                  }
                  const widget = document.getElementById('google_translate_element');
                  if (widget) {
                       widget.style.display = 'none';
                       widget.setAttribute('aria-hidden', 'true');
                   }
                  observer.disconnect();
              }
          }, 10000);

           if(widgetDiv) {
              observer.observe(widgetDiv, { childList: true, subtree: true });
           } else {
               console.error('#google_translate_element not found. Cannot initialize or observe GTranslate.');
               clearTimeout(observerTimeout);
               const btn = document.getElementById('translateBtn');
                  if (btn) {
                       btn.innerHTML = errorHtmlTranslate + ' (DIV missing)';
                       btn.disabled = true;
                       btn.setAttribute('aria-expanded', 'false');
                  }
           }
        } catch (error) {
          console.error('Error initializing Google Translate Element for Vishwa Samvidhan:', error);
            const translateButton = document.getElementById('translateBtn');
            if (translateButton) {
                translateButton.disabled = false;
                if (translateButton.innerHTML.includes('<span class="emoji-sandclock">')) {
                    translateButton.innerHTML = errorHtmlTranslate + ' (Init Error)';
                } else if (!translateButton.innerHTML.includes(hideHtmlTranslate.substring(0,20))) {
                    translateButton.innerHTML = showHtmlTranslate;
                }
                translateButton.setAttribute('aria-expanded', 'false');
            }
            const widgetDiv = document.getElementById('google_translate_element');
            if (widgetDiv) {
                widgetDiv.style.display = 'none';
                widgetDiv.setAttribute('aria-hidden', 'true');
            }
        }
    };

    window.initTranslate = function(event) {
        const widget = document.getElementById('google_translate_element');
        const btn = event.currentTarget;

        if (!widget || !btn) {
            console.error('Translate button or widget element not found for initTranslate.');
            if (btn) { btn.disabled = true; btn.innerHTML = errorHtmlTranslate + ' (Config Error)';}
            return;
        }
        if (btn.disabled || btn.innerHTML.includes('<span class="emoji-sandclock">')) {
            return; // Already processing
        }

        const isWidgetHidden = widget.style.display === 'none' || widget.style.display === '';

        if (!translateLoaded) {
          btn.disabled = true;
          btn.innerHTML = loadingHtmlTranslate;
          widget.style.display = 'none'; // Ensure hidden during load
          widget.setAttribute('aria-hidden', 'true');
          btn.setAttribute('aria-expanded', 'false');


          let script = document.getElementById('google-translate-script');
          if (!script) {
              script = document.createElement('script');
              script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
              script.async = true;
              script.defer = true;
              script.id = 'google-translate-script';
              script.onerror = () => {
                 console.error('GTranslate script failed to load.');
                 btn.disabled = false;
                 btn.innerHTML = errorHtmlTranslate + ' (Script Load Fail)';
                 widget.style.display = 'none';
                 widget.setAttribute('aria-hidden', 'true');
                 btn.setAttribute('aria-expanded', 'false');
              };
              document.body.appendChild(script);
          } else {
               // Script tag exists, but not loaded. Wait for callback.
               // Button state already set to loading.
          }
        } else { // Translate script and widget are loaded
          if (isWidgetHidden) {
             widget.style.display = 'flex';
             btn.innerHTML = hideHtmlTranslate;
             btn.setAttribute('aria-expanded', 'true');
             widget.setAttribute('aria-hidden', 'false');
          } else {
             // Hiding: The most reliable way is to reload.
             // Update button text first for immediate feedback.
             btn.innerHTML = showHtmlTranslate;
             btn.setAttribute('aria-expanded', 'false');
             widget.style.display = 'none';
             widget.setAttribute('aria-hidden', 'true');
             window.location.reload();
          }
        }
    };

    // --- Anthem Functionality ---
    let samvidhanAnthem;
    let understandPrincipalsBtn;
    let stopAnthemBtn;

    function understandPrincipalsAndPlayAnthem() {
        if (!samvidhanAnthem || !understandPrincipalsBtn || !stopAnthemBtn) {
            console.error("Anthem audio or buttons not initialized.");
            return;
        }
        scrollToElement('preamble');

        if (samvidhanAnthem.paused) {
            samvidhanAnthem.play()
                .then(() => {
                    console.log('Vishwa Samvidhan Anthem started.');
                    understandPrincipalsBtn.style.display = 'none';
                    stopAnthemBtn.style.display = 'inline-flex';
                    stopAnthemBtn.setAttribute('aria-hidden', 'false');
                    understandPrincipalsBtn.setAttribute('aria-hidden', 'true');
                })
                .catch(error => {
                    console.error('Failed to play Samvidhan Anthem:', error);
                    alert('Could not play the anthem. Your browser might be blocking autoplay.');
                });
        } else { // Already playing
            understandPrincipalsBtn.style.display = 'none';
            stopAnthemBtn.style.display = 'inline-flex';
            stopAnthemBtn.setAttribute('aria-hidden', 'false');
            understandPrincipalsBtn.setAttribute('aria-hidden', 'true');
        }
    }

    function stopAnthem() {
        if (!samvidhanAnthem || !understandPrincipalsBtn || !stopAnthemBtn) {
            console.error("Anthem audio or buttons not initialized for stopping.");
            return;
        }
        if (!samvidhanAnthem.paused) {
            samvidhanAnthem.pause();
            samvidhanAnthem.currentTime = 0; // Rewind
            console.log('Vishwa Samvidhan Anthem stopped.');
        }
        stopAnthemBtn.style.display = 'none';
        understandPrincipalsBtn.style.display = 'inline-flex';
        understandPrincipalsBtn.setAttribute('aria-hidden', 'false');
        stopAnthemBtn.setAttribute('aria-hidden', 'true');
        understandPrincipalsBtn.focus(); // Return focus
    }


    function setPrintDate() {
        const date = new Date().toLocaleDateString(document.documentElement.lang || 'en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
        const safeDate = date.replace(/([\\"'])/g, "\\$1"); // Basic sanitization for CSS content
        
        let printStyleSheet = document.getElementById('print-date-style');
        if (!printStyleSheet) {
            printStyleSheet = document.createElement("style");
            printStyleSheet.id = 'print-date-style';
            document.head.appendChild(printStyleSheet);
        }
        
        printStyleSheet.textContent = `
            @media print {
                #living-archive-info p:last-of-type:after {
                    content: "\\0A \\0AThis digital covenant (Vishwa Samvidhan) was rendered for printing on: ${safeDate}.\\0APlease verify against primary archival sources for critical applications across millennia.";
                }
            }
        `;
    }


    document.addEventListener('DOMContentLoaded', function() {
        initSkipLink();
        enableSmoothScroll('.primary-navigation a[href^="#"]');
        enableSmoothScroll('.toc-navigation a.toc-link[href^="#"]');
        enableSmoothScroll('a.back-to-top-link[href^="#"]');
        initTocActiveState();
        initLivingArchiveDetailsLink();
        setPrintDate();

        const translateBtnConst = document.getElementById('translateBtn');
        const translateWidgetDivConst = document.getElementById('google_translate_element');

        if (translateBtnConst) {
            translateBtnConst.setAttribute('aria-controls', 'google_translate_element');
            translateBtnConst.setAttribute('aria-expanded', 'false');
             if (!translateBtnConst.innerHTML || translateBtnConst.innerHTML.trim() === "" || translateBtnConst.innerHTML.includes("<!-- JS will populate this -->")) {
                translateBtnConst.innerHTML = showHtmlTranslate;
            }
            translateBtnConst.disabled = false;
        } else {
            console.warn('#translateBtn not found on DOMContentLoaded.');
        }
        if (translateWidgetDivConst) {
            translateWidgetDivConst.style.display = 'none';
            translateWidgetDivConst.setAttribute('aria-hidden', 'true');
        } else {
            console.warn('#google_translate_element not found on DOMContentLoaded.');
            if(translateBtnConst) {
               translateBtnConst.disabled = true;
               translateBtnConst.innerHTML = errorHtmlTranslate + ' (DIV Missing)';
               translateBtnConst.setAttribute('aria-expanded', 'false');
           }
        }

        const footerTranslateLink = document.getElementById('footer-translate-link-dummy');
        if(footerTranslateLink && translateBtnConst){
            footerTranslateLink.addEventListener('click', (e)=>{
                e.preventDefault();
                translateBtnConst.click();
                translateBtnConst.scrollIntoView({behavior: 'smooth', block: 'center'});
            });
        }

        // Initialize Anthem elements
        samvidhanAnthem = document.getElementById('samvidhanAnthemAudio');
        understandPrincipalsBtn = document.getElementById('understandPrincipalsBtn');
        stopAnthemBtn = document.getElementById('stopAnthemBtn');

        if (samvidhanAnthem && understandPrincipalsBtn && stopAnthemBtn) {
            understandPrincipalsBtn.addEventListener('click', understandPrincipalsAndPlayAnthem);
            stopAnthemBtn.addEventListener('click', stopAnthem);
            stopAnthemBtn.setAttribute('aria-hidden', 'true'); // Initially hidden
        } else {
            if(!samvidhanAnthem) console.warn("Anthem audio element not found.");
            if(!understandPrincipalsBtn) console.warn("Understand Principals button not found.");
            if(!stopAnthemBtn) console.warn("Stop Anthem button not found.");
        }


        console.log("Vishwa Samvidhan - Eternal Script (Enhanced v2.8) Initialized. The Path Unfolds in Wisdom.");
    });

})();