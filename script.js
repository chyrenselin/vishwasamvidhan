// eternal-script.js - Enhanced v2.7
(function() {
    'use strict';

    document.documentElement.classList.remove('no-js');
    document.documentElement.classList.add('js-enabled');

    function enableSmoothScroll(selector) {
        const links = document.querySelectorAll(selector);
        links.forEach(link => {
            link.addEventListener('click', function(e) {
                const href = this.getAttribute('href');
                if (href && href.startsWith('#')) {
                    e.preventDefault();
                    const targetId = href.substring(1);
                    const targetElement = document.getElementById(targetId);
                    if (targetElement) {
                        targetElement.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start'
                        });
                        // Attempt to set focus for accessibility, ensuring it's focusable
                        const oldTabIndex = targetElement.getAttribute('tabindex');
                        if (oldTabIndex === null) { // Only add tabindex if it wasn't there
                            targetElement.setAttribute('tabindex', -1);
                            targetElement.addEventListener('blur', () => {
                                if (targetElement.getAttribute('tabindex') === '-1') {
                                    targetElement.removeAttribute('tabindex');
                                }
                            }, { once: true });
                        }
                        targetElement.focus({ preventScroll: true });
                    } else if (href === "#") { 
                         window.scrollTo({ top: 0, behavior: 'smooth'});
                         document.body.focus({preventScroll:true}); // Focus body for top scroll
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
                const oldTabIndex = mainContent.getAttribute('tabindex');
                if (oldTabIndex === null) {
                    mainContent.setAttribute('tabindex', -1);
                }
                mainContent.focus();
                if (oldTabIndex === null) { // only remove if we added it
                     mainContent.addEventListener('blur', function() {
                         if(mainContent.getAttribute('tabindex') === '-1') { 
                            mainContent.removeAttribute('tabindex');
                         }
                     }, { once: true });
                }
            });
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
             // Fallback: if no specific section is prominently in view but we're scrolled down,
             // try to highlight the "closest" one above the viewport's mid-line or default to first if near top.
            if (!isAnyIntersecting && window.scrollY > 100) { // some scroll has happened
                let closestSection = null;
                let smallestDistance = Infinity;
                const viewportMidY = window.scrollY + (window.innerHeight / 2);

                sections.forEach(item => {
                    const sectionTop = item.section.offsetTop;
                    const distance = Math.abs(sectionTop - viewportMidY);
                    if (sectionTop <= viewportMidY && distance < smallestDistance) { // prioritize sections above or at mid
                        smallestDistance = distance;
                        closestSection = item;
                    }
                });
                if(!closestSection && sections.length > 0 && window.scrollY < sections[0].section.offsetTop){
                     closestSection = sections[0]; // If before first section, highlight first
                }

                if (closestSection && closestSection.link !== lastActiveLink) {
                    if(lastActiveLink) lastActiveLink.classList.remove('active');
                    closestSection.link.classList.add('active');
                    lastActiveLink = closestSection.link;
                }
            } else if (!isAnyIntersecting && window.scrollY <= 100 && sections.length > 0 && sections[0].link !== lastActiveLink) {
                // If near top and nothing is intersecting, ensure Preamble or first item is active.
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
    
    let lastInputWasKeyboard = false;
    document.body.addEventListener('mousedown', () => {
        lastInputWasKeyboard = false;
        document.body.classList.remove('using-keyboard');
    }, true);
    document.body.addEventListener('keydown', (event) => {
        if (['Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' '].includes(event.key)) {
            lastInputWasKeyboard = true;
            document.body.classList.add('using-keyboard');
        }
    }, true);

    // --- Google Translate Functionality ---
    let translateLoaded = false;
    const showHtmlTranslate = 'Experience in your mother tongue <span class="emoji-pulse">😮</span><span class="emoji-spin">🌍</span>';
    const hideHtmlTranslate = 'Hide Translation <span class="emoji-spin">🌍</span><span class="emoji-pulse">❌</span>';
    const loadingHtmlTranslate = 'Loading Translation... <span class="emoji-sandclock">⌛</span>';

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
                  console.log('User clicked Translate button during script load. Showing widget.');
                  translateButton.innerHTML = hideHtmlTranslate;
                  widgetDiv.style.display = 'flex';
                  translateButton.setAttribute('aria-expanded', 'true');
                  widgetDiv.setAttribute('aria-hidden', 'false');
                } else {
                   console.log('Google Translate widget initialized. Keeping hidden as per button state.');
                   widgetDiv.style.display = 'none';
                   widgetDiv.setAttribute('aria-hidden', 'true');
                   translateButton.setAttribute('aria-expanded', 'false');
                    if (!translateButton.innerHTML.includes('Hide Translation')) {
                         translateButton.innerHTML = showHtmlTranslate;
                    }
                }
              } else { console.warn('#translateBtn not found after widget init.'); }
            }
          });

          observerTimeout = setTimeout(() => {
              if (!translateLoaded) {
                  console.warn('MutationObserver timed out or GTranslate script failed to render.');
                  const btn = document.getElementById('translateBtn');
                  if (btn) {
                       if(btn.innerHTML.includes('<span class="emoji-sandclock">')) {
                           btn.innerHTML = 'Translation failed <span class="emoji-spin">🌍</span><span class="emoji-pulse">❌</span>';
                       } else {
                            if (!btn.innerHTML.includes('Hide Translation')) {
                                btn.innerHTML = showHtmlTranslate;
                            }
                       }
                       btn.disabled = false;
                       btn.setAttribute('aria-expanded', 'false');
                  }
                  const widget = document.getElementById('google_translate_element');
                  if (widget) {
                       widget.style.display = 'none';
                       widget.setAttribute('aria-hidden', 'true');
                   }
                  translateLoaded = false;
                  observer.disconnect();
              }
          }, 10000); 

           if(widgetDiv) {
              setTimeout(() => { 
                   observer.observe(widgetDiv, { childList: true, subtree: true });
                   console.log('MutationObserver started on #google_translate_element');
              }, 50);
           } else {
               console.error('#google_translate_element not found. Cannot initialize or observe.');
               clearTimeout(observerTimeout); 
               const btn = document.getElementById('translateBtn');
                  if (btn) {
                       btn.innerHTML = 'Translate DIV missing <span class="emoji-spin">🌍</span><span class="emoji-pulse">❌</span>';
                       btn.disabled = true; 
                       btn.setAttribute('aria-expanded', 'false');
                  }
               translateLoaded = false;
           }
        } catch (error) {
          console.error('Error initializing Google Translate Element for Vishwa Samvidhan:', error);
            const translateButton = document.getElementById('translateBtn');
            if (translateButton) {
                translateButton.disabled = false;
                if (translateButton.innerHTML.includes('<span class="emoji-sandclock">')) {
                    translateButton.innerHTML = 'Translate init error <span class="emoji-spin">🌍</span><span class="emoji-pulse">❌</span>';
                } else {
                    translateButton.innerHTML = showHtmlTranslate;
                }
                translateButton.setAttribute('aria-expanded', 'false');
            }
            const widgetDiv = document.getElementById('google_translate_element');
            if (widgetDiv) {
                widgetDiv.style.display = 'none';
                widgetDiv.setAttribute('aria-hidden', 'true');
            }
            translateLoaded = false;
        }
    };

    window.initTranslate = function(event) { 
        const widget = document.getElementById('google_translate_element');
        const btn = event.currentTarget;

        if (!widget || !btn) {
            console.error('Translate button or widget element not found when clicked.');
            if (btn) btn.disabled = true;
            return;
        }
        if (btn.disabled || btn.innerHTML.includes('<span class="emoji-sandclock">')) {
            console.log('Translate button is already loading/disabled, ignoring click.');
            return;
        }

        const isWidgetHidden = widget.style.display === 'none' || widget.style.display === '';

        if (!translateLoaded) {
          console.log('GTranslate widget not initialized. Loading script...');
          btn.disabled = true;
          btn.innerHTML = loadingHtmlTranslate;
          btn.setAttribute('aria-expanded', 'false');
          widget.style.display = 'none';
          widget.setAttribute('aria-hidden', 'true');

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
                 btn.innerHTML = 'Script load failed <span class="emoji-spin">🌍</span><span class="emoji-pulse">❌</span>';
                 widget.style.display = 'none';
                 widget.setAttribute('aria-hidden', 'true');
                 translateLoaded = false;
                 btn.setAttribute('aria-expanded', 'false');
              };
              document.body.appendChild(script);
              console.log('GTranslate script tag appended to body.');
          } else {
               console.log('GTranslate script tag already exists. Waiting for callback...');
               btn.disabled = true;
               btn.innerHTML = loadingHtmlTranslate;
               btn.setAttribute('aria-expanded', 'false');
          }
        } else {
          if (isWidgetHidden) {
             console.log('Showing GTranslate widget...');
             widget.style.display = 'flex'; 
             btn.innerHTML = hideHtmlTranslate;
             btn.setAttribute('aria-expanded', 'true');
             widget.setAttribute('aria-hidden', 'false');
             console.log('GTranslate widget shown.');
          } else {
             console.log('Hiding GTranslate widget and reloading page...');
             widget.style.display = 'none';
             btn.innerHTML = showHtmlTranslate;
             btn.setAttribute('aria-expanded', 'false');
             widget.setAttribute('aria-hidden', 'true');
             window.location.reload();
          }
        }
    };
    
    // Function to set the current date in the print styles
    function setPrintDate() {
        const date = new Date().toLocaleDateString(document.documentElement.lang || 'en-US', { 
            year: 'numeric', month: 'long', day: 'numeric' 
        });
        const styleElement = document.createElement('style');
        // Escape special characters in the date string if necessary for CSS content
        const safeDate = date.replace(/([\\"'])/g, "\\$1");

        styleElement.textContent = `
            @media print {
                #living-archive-info p:last-of-type:after {
                    content: "\\0A \\0A This digital document (Version 2.7) was generated on ${safeDate}. Verify against primary archival sources if critical.";
                    /* Other properties like display, white-space, etc., are inherited from the base print CSS */
                }
            }
        `;
        document.head.appendChild(styleElement);
        console.log('Print date style dynamically inserted for Vishwa Samvidhan.');
    }


    document.addEventListener('DOMContentLoaded', function() {
        initSkipLink();
        enableSmoothScroll('.primary-navigation a[href^="#"]');
        enableSmoothScroll('.toc-navigation a.toc-link[href^="#"]');
        enableSmoothScroll('a.back-to-top-link[href^="#"]');
        initTocActiveState(); 
        initLivingArchiveDetailsLink();
        setPrintDate(); // Set the date for printing
        
        const translateBtnConst = document.getElementById('translateBtn');
        const translateWidgetDivConst = document.getElementById('google_translate_element');

        if (translateBtnConst) {
            translateBtnConst.setAttribute('aria-controls', 'google_translate_element');
            translateBtnConst.setAttribute('aria-expanded', 'false');
            if (!translateBtnConst.innerHTML.includes('Hide Translation')) { 
                translateBtnConst.innerHTML = showHtmlTranslate;
            }
            translateBtnConst.disabled = false;
        } else {
            console.warn('#translateBtn not found (Vishwa Samvidhan) on DOMContentLoaded.');
        }
        if (translateWidgetDivConst) {
            translateWidgetDivConst.style.display = 'none';
            translateWidgetDivConst.setAttribute('aria-hidden', 'true');
        } else {
            console.warn('#google_translate_element not found on DOMContentLoaded.');
            if(translateBtnConst) {
               translateBtnConst.disabled = true;
               translateBtnConst.innerHTML = 'Translate DIV missing';
               translateBtnConst.setAttribute('aria-expanded', 'false');
               console.error('Translate button disabled (DOMContentLoaded), widget div is missing.');
           }
        }
        
        const footerTranslateLink = document.getElementById('footer-translate-link-dummy');
        if(footerTranslateLink && translateBtnConst){
            footerTranslateLink.addEventListener('click', (e)=>{
                e.preventDefault();
                translateBtnConst.click(); 
                // Scroll to the button in case it's out of view, esp. on mobile
                translateBtnConst.scrollIntoView({behavior: 'smooth', block: 'center'}); 
            });
        }

        console.log("Vishwa Samvidhan - Eternal Script (Enhanced v2.7) Initialized. The Path Unfolds in Wisdom.");
    });

})();