// eternal-script.js - Enhanced v2.11 (Removed file:// UI Message)
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
                         // Do not attempt to focus document.body immediately after scrollTo, can be jarring.
                         // Browsers usually manage focus after scroll better if not intervened.
                         // For a 'back to top' link (which href="# usually is), consider focusing body or skip link after scroll is complete
                         // For the general case like "#", leaving focus as is might be best.
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
             console.log('Skip link initialized.');
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
                    // Get bounding client rect for rough visibility check optimization
                    sections.push({link: link, section: section, top: section.getBoundingClientRect().top + window.scrollY});
                } else {
                    console.warn(`Section with ID "${targetId}" not found for TOC link:`, link);
                }
            } else {
                console.warn(`TOC link has invalid href:`, link);
            }
        });

        if(sections.length === 0) {
            console.log('No valid sections found for TOC active state. TOC navigation may not work.');
            // Consider hiding the TOC entirely if there are no sections
            const tocNav = document.querySelector('.toc-navigation');
            if(tocNav) tocNav.style.display = 'none';
            return;
        }

        let lastActiveLink = null;
        let lastScrollY = 0;
        let ticking = false;

        const updateActiveLink = () => {
            const scrollY = window.scrollY;
            const viewportHeight = window.innerHeight;
             // Determine scroll direction
            const scrollDirection = scrollY > lastScrollY ? 'down' : 'up';
            lastScrollY = scrollY;

            // Define a slightly adjustable threshold for when a section becomes "active"
            // 30% of the viewport height from the top is a common pattern
            const threshold = viewportHeight * 0.30; // 30vh from top of viewport

            let currentlyActive = null;

             // Check sections that are currently in or approaching the active viewport area
            // Process sections from last to first if scrolling up, and first to last if scrolling down
            const orderedSections = scrollDirection === 'down' ? sections : sections.slice().reverse();

            for (const item of orderedSections) {
                const sectionTop = item.section.getBoundingClientRect().top + scrollY;
                const sectionBottom = sectionTop + item.section.offsetHeight;

                 // A section is considered 'active' if its top is within the top part of the viewport (e.g., top 30%)
                 // and its bottom is below the threshold (it hasn't scrolled completely past it)
                 if (sectionTop <= scrollY + threshold && sectionBottom > scrollY + threshold) {
                     currentlyActive = item.link;
                     break; // Found the topmost intersecting section based on scroll direction
                 }
             }

             // Fallback: If no section intersects the threshold (e.g., between sections, or near the very top/bottom)
             // Activate the nearest section *before* the threshold or the first/last sections.
             if (!currentlyActive) {
                 // If near the top, activate the first section
                 if (sections.length > 0 && scrollY < sections[0].top + threshold) {
                     currentlyActive = sections[0].link;
                 } else if (sections.length > 0 && scrollY + viewportHeight > sections[sections.length - 1].section.offsetTop + sections[sections.length - 1].section.offsetHeight * 0.8) { // Near the very bottom (last 20% of last section)
                     currentlyActive = sections[sections.length - 1].link;
                 } else {
                      // If somewhere in between sections, find the one whose *bottom* is just above the threshold
                      // or whose *top* is closest to the threshold
                      let closestSection = null;
                      let minDistanceFromViewportTop = Infinity;
                      sections.forEach(item => {
                           const distanceFromTop = item.section.getBoundingClientRect().top;
                           // We want the closest one *above* or *at* the top of the viewport (or slightly below threshold)
                           if (distanceFromTop <= threshold) {
                               const absoluteDistanceFromTop = Math.abs(distanceFromTop - threshold);
                               if (absoluteDistanceFromTop < minDistanceFromViewportTop) {
                                    minDistanceFromViewportTop = absoluteDistanceFromTop;
                                    closestSection = item;
                               }
                           }
                       });

                      if(closestSection) currentlyActive = closestSection.link;
                      // If still no active section (e.g. content shorter than viewport, or edge cases), keep last or null
                      // If last active link scrolled out of view above threshold without a new one taking its place,
                      // the previous active link is usually the desired one. This logic handles that implicitly if
                      // it finds the one whose *bottom* crossed the threshold last.

                 }
             }


            if (currentlyActive && currentlyActive !== lastActiveLink) {
                if (lastActiveLink) lastActiveLink.classList.remove('active');
                currentlyActive.classList.add('active');
                lastActiveLink = currentlyActive;
                 // console.log(`Active TOC link updated to: ${currentlyActive.textContent.trim()}`);
            } else if (!currentlyActive && lastActiveLink) {
                 // If no active section found by threshold logic, check if we are still visually within
                 // the boundary of the last active section. This helps prevent the link from becoming inactive
                 // when scrolling slowly in the middle of a section.
                 const lastActiveSection = sections.find(item => item.link === lastActiveLink)?.section;
                 if (lastActiveSection) {
                     const rect = lastActiveSection.getBoundingClientRect();
                     // Check if the section is still at least partially in the viewport
                     if (rect.bottom > 0 && rect.top < viewportHeight) {
                         // Keep the last active link
                         currentlyActive = lastActiveLink; // Re-assign to prevent it being set to null implicitly below
                          // console.log(`Keeping last active TOC link as its section is still visible.`);
                     } else if (scrollY <= sections[0].top + threshold / 2) { // If scrolled back very near the top
                         if(lastActiveLink) lastActiveLink.classList.remove('active');
                          if(sections.length > 0) {
                            sections[0].link.classList.add('active');
                            lastActiveLink = sections[0].link;
                            // console.log('Active TOC link reset to first section due to near top scroll.');
                           }
                     } else {
                         // Last active section is fully out of view, and no new one found by threshold.
                         // Remove the active class.
                         if(lastActiveLink) lastActiveLink.classList.remove('active');
                         lastActiveLink = null;
                         // console.log('Last active TOC link scrolled out of view, no new active section found.');
                     }
                 }
            } else if (!currentlyActive && !lastActiveLink && sections.length > 0 && scrollY <= sections[0].top + threshold) {
                 // Handle initial load or scroll to top case - if the first section is visible near top
                 sections[0].link.classList.add('active');
                 lastActiveLink = sections[0].link;
                 // console.log('Initial active TOC link set to first section.');
            }


            ticking = false; // Reset ticking flag
        };

        // Function to throttle updateActiveLink on scroll
        const requestTick = () => {
            if (!ticking) {
                requestAnimationFrame(updateActiveLink);
                ticking = true;
            }
        };

        // Attach the throttled update function to the scroll event
        window.addEventListener('scroll', requestTick, { passive: true });
        // Run update once on load to set the initial active state
        updateActiveLink();

        console.log('TOC active state tracking initialized.');

    }

    function initLivingArchiveDetailsLink() {
        const livingArchiveLink = document.getElementById('living-archive-details-link');
        if (livingArchiveLink) {
            livingArchiveLink.addEventListener('click', function(e) {
                e.preventDefault();
                console.log("Conceptual link for Living Archive details clicked (Vishwa Samvidhan).");
                alert("This link is conceptual for the Vishwa Samvidhan document.\n\nIn a fully developed system, this would lead to detailed information regarding Abstract Semantic Language (ASL), long-term physical/digital preservation protocols, and the broader vision for the Living Archive designed for multi-millennial endurance.");
            });
             console.log('Living Archive details link initialized.');
        } else {
             console.warn('Living Archive details link with ID "living-archive-details-link" not found.');
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

    // Function to get appropriate button text based on screen width
    // Simplified to use the same "show" text regardless of size as requested, relying on CSS for layout
    function getTranslateButtonText(type) {
        const microThreshold = 200;
        const width = window.innerWidth;

        // Define button texts
        const texts = {
            show: 'Experience in your mother tongue <span class="emoji-pulse">😮</span><span class="emoji-spin">🌍</span>',
            hide: 'Hide Translation <span class="emoji-spin">🌍</span><span class="emoji-pulse">❌</span>',
            loading: width <= microThreshold ? 'Loading... <span class="emoji-sandclock">⌛</span>' : 'Loading Translation... <span class="emoji-sandclock">⌛</span>',
            error: width <= microThreshold ? 'Error <span class="emoji-pulse">⚠️</span>' : 'Translate Error <span class="emoji-pulse">⚠️</span>',
            divMissingError: width <= microThreshold ? 'DIV Missing <span class="emoji-pulse">⚠️</span>' : 'Translate DIV Missing <span class="emoji-pulse">⚠️</span>'
        };

        return texts[type];
    }


    window.googleTranslateElementInit = function() {
        console.log('Google Translate Element Initializing for Vishwa Samvidhan...');
        try {
          const newIncludedLanguages = 'en,hi,es,ar,fr,zh-CN,ru,de,bn,pt,ja,ur,ta,pa,ko,it,tr,nl,id,vi,th,ml,te,mr,gu,kn,la,sa';

          new google.translate.TranslateElement({
            pageLanguage: 'en', // Assuming the base language of index.html is English
            includedLanguages: newIncludedLanguages,
            layout: google.translate.TranslateElement.InlineLayout.SIMPLE,
            autoDisplay: false // Crucial: Prevents immediate display until button click
          }, 'google_translate_element');
          console.log('Google Translate Element Initialized.');

          const widgetDiv = document.getElementById('google_translate_element');
          const translateButton = document.getElementById('translateBtn');
          let observerTimeout;

          const observer = new MutationObserver((mutations, obs) => {
            // Check if the main Google Translate widget structure is present within the target div
            if (widgetDiv && widgetDiv.children.length > 0 && widgetDiv.querySelector('.goog-te-gadget-simple')) {
              console.log('Google Translate widget DOM rendered.');
              translateLoaded = true;
              obs.disconnect(); // Stop observing
              clearTimeout(observerTimeout); // Clear the timeout as we've succeeded

              if (translateButton) {
                translateButton.disabled = false; // Enable the button

                // Check if the button was showing loading text (clicked while script loaded)
                if (translateButton.innerHTML.includes('<span class="emoji-sandclock">')) {
                    console.log('Button was in loading state, showing widget after init.');
                    // User clicked during load, so show widget now and set button to hide state
                    translateButton.innerHTML = getTranslateButtonText('hide'); // Use hide text for current size
                    widgetDiv.style.display = 'flex';
                    translateButton.setAttribute('aria-expanded', 'true');
                    widgetDiv.setAttribute('aria-hidden', 'false');
                    widgetDiv.classList.remove('google-translate-hidden');
                } else {
                   // Widget initialized, but button wasn't clicked during load.
                   // Ensure widget is hidden, button text should be its initial state.
                   console.log('Widget init successful, but button not in loading state.');
                    widgetDiv.style.display = 'none';
                    widgetDiv.setAttribute('aria-hidden', 'true');
                    widgetDiv.classList.add('google-translate-hidden');
                    translateButton.setAttribute('aria-expanded', 'false');
                    // Re-set button text to the 'show' state for the current window size
                    translateButton.innerHTML = getTranslateButtonText('show');
                }

              } else {
                  console.warn('#translateBtn not found after GTranslate widget init.');
              }
            }
          });

          // Set a timeout to detect if the Google Translate script fails to load or render the widget DOM
          observerTimeout = setTimeout(() => {
              if (!translateLoaded) {
                  console.warn('MutationObserver timed out or Google Translate script failed to render the widget DOM within 10 seconds.');
                  const btn = document.getElementById('translateBtn');
                  if (btn) {
                       btn.disabled = false; // Enable button
                       // Update button text to error state if it was loading
                       if (btn.innerHTML.includes('<span class="emoji-sandclock">')) {
                           btn.innerHTML = getTranslateButtonText('error'); // Use error text for current size
                       } else {
                             btn.innerHTML = getTranslateButtonText('show'); // Restore initial if not loading/error state
                       }
                       btn.setAttribute('aria-expanded', 'false');
                  }
                   const widget = document.getElementById('google_translate_element');
                   if (widget) {
                       widget.style.display = 'none';
                       widget.setAttribute('aria-hidden', 'true');
                       widget.classList.add('google-translate-hidden');
                   }
                  translateLoaded = false;
                  observer.disconnect(); // Stop observing
              }
          }, 10000); // 10 seconds timeout


           if(widgetDiv) {
               // Start observing the widget container for changes (like the google widget DOM appearing)
               // Use a small timeout to ensure the browser finished processing before observing.
              setTimeout(() => {
                   observer.observe(widgetDiv, { childList: true, subtree: true });
                   console.log('MutationObserver started on #google_translate_element.');
              }, 50); // Small delay
           } else {
               // Handle the case where the target div is missing entirely
               console.error('Google Translate widget div #google_translate_element not found on page load. Cannot initialize or observe.');
               clearTimeout(observerTimeout); // Clear the timeout
               const btn = document.getElementById('translateBtn');
                  if (btn) {
                       btn.disabled = true;
                       btn.innerHTML = getTranslateButtonText('divMissingError'); // Set missing div error text for current size
                       btn.setAttribute('aria-expanded', 'false');
                  }
               translateLoaded = false;
           }
        } catch (error) {
          // Catch errors during the googleTranslateElementInit function itself
          console.error('Error during Google Translate Element initialization function:', error);
            const translateButton = document.getElementById('translateBtn');
            if (translateButton) {
                translateButton.disabled = false;
                 // Check if it was in the loading state using the specific loading text
                if (translateButton.innerHTML.includes('<span class="emoji-sandclock">')) {
                     translateButton.innerHTML = getTranslateButtonText('error'); // Set error state for current size
                } else {
                    // If not in loading, revert to show text for current size
                    translateButton.innerHTML = getTranslateButtonText('show');
                }

                translateButton.setAttribute('aria-expanded', 'false');
            }
            const widgetDiv = document.getElementById('google_translate_element');
            if (widgetDiv) {
                widgetDiv.style.display = 'none';
                widgetDiv.setAttribute('aria-hidden', 'true');
                widgetDiv.classList.add('google-translate-hidden');
            }
          translateLoaded = false;
        }
         console.log('googleTranslateElementInit finished.'); // Log when this callback completes
    };


    /**
     * Handles the click event for the translate button.
     * Loads the Google Translate script if not already loaded,
     * or toggles the visibility/resets translation if loaded.
     * @param {Event} event - The click event object.
     */
    window.initTranslate = function(event) {
        const widget = document.getElementById('google_translate_element');
        const btn = event.currentTarget;

        if (!widget || !btn) {
            console.error('Translate button or widget element not found for initTranslate logic.');
            if (btn) { btn.disabled = true; btn.innerHTML = getTranslateButtonText('divMissingError'); } // Ensure button is disabled and shows error text
            return;
        }
        // Prevent action if button is disabled (e.g., already loading or permanently disabled due to missing div)
        // Check if it's already in a loading state using size-independent check
        if (btn.disabled || btn.innerHTML.includes('<span class="emoji-sandclock">')) {
            console.log('initTranslate: Button is disabled or in loading state, ignoring click.');
            return;
        }

        // Determine current state based on widget container visibility class
        const isWidgetHidden = widget.classList.contains('google-translate-hidden');

        if (!translateLoaded) {
          // Widget not loaded/initialized yet. Initiate loading.
          console.log('initTranslate: Widget not loaded. Starting load process...');
          btn.disabled = true; // Disable button
          // Set button text to LOADING state for the current screen size
          btn.innerHTML = getTranslateButtonText('loading');
          btn.setAttribute('aria-expanded', 'false');
          // Ensure widget remains hidden while loading
          widget.style.display = 'none';
          widget.setAttribute('aria-hidden', 'true');
          widget.classList.add('google-translate-hidden'); // Add/keep hiding class

          let script = document.getElementById('google-translate-script');
          if (!script) {
              // Create and append the script tag
              script = document.createElement('script');
              script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
              script.async = true;
              script.defer = true; // Using defer is generally better for scripts that don't block page parse
              script.id = 'google-translate-script';
              script.onerror = () => {
                 console.error('initTranslate: Google Translate script failed to load.');
                 btn.disabled = false; // Enable button
                 // Set button text to ERROR state for the current screen size
                 btn.innerHTML = getTranslateButtonText('error');
                 // Keep widget hidden and inaccessible
                 widget.style.display = 'none';
                 widget.setAttribute('aria-hidden', 'true');
                 widget.classList.add('google-translate-hidden');
                 translateLoaded = false; // Confirm failed state
                 btn.setAttribute('aria-expanded', 'false');
              };
              document.body.appendChild(script);
              console.log('initTranslate: Google Translate script tag appended.');
          } else {
               // Script tag already exists but translateLoaded is false (likely failed previous load or still loading)
               console.log('initTranslate: Script tag already exists. Waiting for googleTranslateElementInit callback or timeout.');
               // Button is already disabled and set to loading text above.
          }
        } else {
          // Widget is loaded. Toggle visibility or reload to reset.
          if (isWidgetHidden) { // Widget is hidden, clicked to Show
             console.log('initTranslate: Widget loaded and hidden. Showing widget.');
             widget.style.display = 'flex'; // Or 'block', depending on layout preference
             widget.classList.remove('google-translate-hidden'); // Remove CSS hiding class
             // Set button text to HIDE state for the current screen size
             btn.innerHTML = getTranslateButtonText('hide');
             btn.setAttribute('aria-expanded', 'true'); // Indicate expanded
             widget.setAttribute('aria-hidden', 'false'); // Make accessible

          } else { // Widget is shown, clicked to Hide / Reset
             console.log('initTranslate: Widget loaded and shown. Hiding and reloading page.');
             // Hiding: First hide the widget visually for immediate feedback
             widget.style.display = 'none';
             widget.classList.add('google-translate-hidden');
             // Set button text back to SHOW state for the current screen size
             btn.innerHTML = getTranslateButtonText('show');
             btn.setAttribute('aria-expanded', 'false'); // Indicate collapsed
             widget.setAttribute('aria-hidden', 'true'); // Make inaccessible

             // Reload the page to remove Google Translate's DOM modifications reliably
             window.location.reload();
             // Note: Code after reload() will not execute reliably.
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
        // Scroll to the main constitution body or preamble section
        scrollToElement('main-content'); // Scroll to main content wrapper first
        // Then possibly scroll specifically to preamble if main-content isn't enough
        setTimeout(() => {
             scrollToElement('preamble', 'start'); // Scroll Preamble to top
        }, 200); // Add a small delay


        if (samvidhanAnthem.paused) {
            samvidhanAnthem.play()
                .then(() => {
                    console.log('Vishwa Samvidhan Anthem started.');
                    // Hide the start button and show the stop button
                    if (understandPrincipalsBtn) {
                       understandPrincipalsBtn.style.display = 'none';
                       understandPrincipalsBtn.setAttribute('aria-hidden', 'true');
                       understandPrincipalsBtn.blur(); // Remove focus from button once action taken
                    }
                     if (stopAnthemBtn) {
                       stopAnthemBtn.style.display = 'inline-flex'; // Use flex to match CSS layout
                       stopAnthemBtn.setAttribute('aria-hidden', 'false');
                       stopAnthemBtn.focus({ preventScroll: true }); // Optionally set focus to the stop button
                    }
                })
                .catch(error => {
                    console.error('Failed to play Samvidhan Anthem (user gesture required or autoplay blocked):', error);
                    // On autoplay failure, alert the user or show a message
                    alert('Failed to play the Anthem. Please try again or check browser autoplay settings.');
                     // Ensure buttons are in their initial state if play failed
                     if (understandPrincipalsBtn) {
                        understandPrincipalsBtn.style.display = 'inline-flex';
                         understandPrincipalsBtn.setAttribute('aria-hidden', 'false');
                     }
                     if (stopAnthemBtn) {
                        stopAnthemBtn.style.display = 'none';
                        stopAnthemBtn.setAttribute('aria-hidden', 'true');
                     }
                });
        } else { // Already playing, button acts only as a scroll-to action now
            console.log('Vishwa Samvidhan Anthem already playing. Scrolling to principles...');
            // Buttons remain as they are if music is already playing
             if (understandPrincipalsBtn) { // Hide Start and show Stop
                 understandPrincipalsBtn.style.display = 'none';
                 understandPrincipalsBtn.setAttribute('aria-hidden', 'true');
             }
             if (stopAnthemBtn) {
                stopAnthemBtn.style.display = 'inline-flex';
                stopAnthemBtn.setAttribute('aria-hidden', 'false');
             }
             // No need to blur understandPrincipalsBtn here if it was already clicked and hid itself

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
        // Hide the stop button and show the start button
        if (stopAnthemBtn) {
           stopAnthemBtn.style.display = 'none';
           stopAnthemBtn.setAttribute('aria-hidden', 'true');
            stopAnthemBtn.blur(); // Remove focus from stop button
        }
        if (understandPrincipalsBtn) {
           understandPrincipalsBtn.style.display = 'inline-flex'; // Use flex
           understandPrincipalsBtn.setAttribute('aria-hidden', 'false');
           understandPrincipalsBtn.focus({ preventScroll: true }); // Set focus back to start button
        }
    }


    function setPrintDate() {
        const date = new Date().toLocaleDateString(document.documentElement.lang || 'en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
        // Set CSS variable `--print-date` on the root element for use in CSS :after content
         document.documentElement.style.setProperty('--print-date', `'${date}'`);
         console.log(`Set --print-date CSS variable to "${date}" for print stylesheet.`);

        // CSS Rule for print is defined in style.css directly now, using var(--print-date)
    }


    document.addEventListener('DOMContentLoaded', function() {
        initSkipLink();
        enableSmoothScroll('.primary-navigation a[href^="#"]');
        enableSmoothScroll('.toc-navigation a.toc-link[href^="#"]');
        enableSmoothScroll('a.back-to-top-link[href^="#"]');
        initTocActiveState();
        initLivingArchiveDetailsLink();
        setPrintDate(); // Set CSS variable for print date

        const translateBtnConst = document.getElementById('translateBtn');
        const translateWidgetDivConst = document.getElementById('google_translate_element');

        if (translateBtnConst) {
            translateBtnConst.setAttribute('aria-controls', 'google_translate_element');
            translateBtnConst.setAttribute('aria-expanded', 'false'); // Default state
            // Set the initial button HTML using the function based on screen size
            translateBtnConst.innerHTML = getTranslateButtonText('show');
            translateBtnConst.disabled = false; // Ensure button is initially enabled

            // Optional: Add a listener for window resize to update button text for responsive changes
            // Use a passive event listener for performance
            let resizeTimeout;
            window.addEventListener('resize', () => {
                clearTimeout(resizeTimeout);
                resizeTimeout = setTimeout(() => {
                     // Only update text if the button is NOT in a state where text is stable (loading, error, hide)
                     // Use size-independent check for loading state
                     if (!translateBtnConst.disabled && !translateBtnConst.innerHTML.includes('<span class="emoji-sandclock">') && !translateBtnConst.innerHTML.includes(getTranslateButtonText('hide').split('<span')[0].trim())) {
                         const currentText = translateBtnConst.innerHTML;
                         const newText = getTranslateButtonText('show');
                         // Avoid unnecessary DOM update if text is the same
                         if (currentText !== newText) {
                            console.log('Window resized, updating translate button text.');
                            translateBtnConst.innerHTML = newText;
                         }
                     }
                     // If the widget is currently displayed (button shows hide text), the hide button text should adapt on resize.
                     // This happens automatically because the hide HTML is derived from the current screen size in getTranslateButtonText('hide').
                     // If the button is in hide state, explicitly update its text on resize.
                     if (!translateBtnConst.disabled && translateBtnConst.innerHTML.includes(getTranslateButtonText('hide').split('<span')[0].trim())) {
                         const newHideText = getTranslateButtonText('hide');
                          if (translateBtnConst.innerHTML !== newHideText) {
                            console.log('Window resized, updating hide translation button text.');
                            translateBtnConst.innerHTML = newHideText;
                         }
                     }
                }, 100); // Debounce resize updates
            }, { passive: true });


             console.log('Translate button initialized.');
        } else {
            console.warn('#translateBtn not found on DOMContentLoaded.');
        }
        if (translateWidgetDivConst) {
            translateWidgetDivConst.style.display = 'none'; // Ensure CSS display is set
            translateWidgetDivConst.setAttribute('aria-hidden', 'true'); // Hide for SR
             translateWidgetDivConst.classList.add('google-translate-hidden'); // Add CSS class for hiding
             console.log('Translate widget div initialized to hidden state.');
        } else {
            console.warn('#google_translate_element not found on DOMContentLoaded.');
            // If the widget div is missing, the button should be disabled and show an error
            if(translateBtnConst) {
               translateBtnConst.disabled = true;
               translateBtnConst.innerHTML = getTranslateButtonText('divMissingError'); // Use error text for current size
               translateBtnConst.setAttribute('aria-expanded', 'false');
               console.error('Translate button disabled due to missing widget div.');
           }
        }

        const footerTranslateLink = document.getElementById('footer-translate-link-dummy');
        if(footerTranslateLink && translateBtnConst){
            footerTranslateLink.addEventListener('click', (e)=>{
                e.preventDefault();
                translateBtnConst.click();
                // Scroll the button itself into view after clicking
                setTimeout(() => {
                    translateBtnConst.scrollIntoView({behavior: 'smooth', block: 'center'});
                }, 50); // Small delay
            });
             console.log('Footer translate link initialized.');
        } else {
            if (!footerTranslateLink) console.warn('Footer translate link with ID "footer-translate-link-dummy" not found.');
            if (!translateBtnConst) console.warn('Translate button not found, cannot initialize footer translate link click handler.');
        }

        // Initialize Anthem elements
        samvidhanAnthem = document.getElementById('samvidhanAnthemAudio');
        understandPrincipalsBtn = document.getElementById('understandPrincipalsBtn');
        stopAnthemBtn = document.getElementById('stopAnthemBtn');

        if (samvidhanAnthem && understandPrincipalsBtn && stopAnthemBtn) {
            understandPrincipalsBtn.addEventListener('click', understandPrincipalsAndPlayAnthem);
            stopAnthemBtn.addEventListener('click', stopAnthem);
            stopAnthemBtn.style.display = 'none'; // Ensure stop button is hidden initially via JS style
            stopAnthemBtn.setAttribute('aria-hidden', 'true'); // Initially hidden for SR
             // Ensure start button is visible and accessible initially
             understandPrincipalsBtn.style.display = 'inline-flex'; // Match CSS layout display type
             understandPrincipalsBtn.setAttribute('aria-hidden', 'false');
            console.log("Anthem elements and buttons initialized.");
        } else {
            if(!samvidhanAnthem) console.warn("Anthem audio element not found.");
            if(!understandPrincipalsBtn) console.warn("Understand Principals button not found.");
            if(!stopAnthemBtn) console.warn("Stop Anthem button not found.");
             // If buttons are missing, consider hiding the functional anthem player element
             const audioPlayer = document.getElementById('samvidhanAnthemAudio');
             if(audioPlayer) audioPlayer.style.display = 'none'; // Hide the audio element itself if no controls
        }


        console.log("Vishwa Samvidhan - Eternal Script (Enhanced v2.10) Initialized. The Path Unfolds in Wisdom.");

        // Check if running on file:// protocol for common development issues
        // Removed the UI element note here as requested.
        if (window.location.protocol === 'file:') {
            console.warn('Running site from file:// protocol. Service Workers and Manifest fetching may fail.');
            // Related console errors for manifest/SW will still appear automatically by browser
        }


    });

})();