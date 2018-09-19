/**
 *
 * HomesteadGallery Plugin- Version 1.5
 *
 */
 
;(function($){
    $.fn.HomesteadGallery = function(options) {

        var defaults = {
            mainClassName : 'HomesteadGallery',
            listPosition : 'left',
            selectionMode : 'click',
            transitionEffect : 'sliding',
            autoSlide : false,
            displayList : true,
            displayControls : true,
            touchControls : true,
            verticalCentering : true,
            adaptiveHeight : false,
            maxHeight : null,
            beforeSlide : null,
            afterSlide : null,
            adaptiveDuration : 200,
            transitionDuration : 500,
            intervalDuration : 3000
        };

        if (this.length == 0)
            return this;
        else if(this.length > 1) {
            this.each(function() {
                $(this).HomesteadGallery(options);
            });
            return this;
        }

        var HomesteadGallery = this;
        var currentListElement;
        HomesteadGallery.plugin = this;
        HomesteadGallery.data = [];
        HomesteadGallery.config = {};
        HomesteadGallery.currentSlide = 0;
        HomesteadGallery.slideCount = 0;
        HomesteadGallery.resizeEvent = null;
        HomesteadGallery.intervalEvent = null;
        HomesteadGallery.touchFirstPosition = null;
        HomesteadGallery.transitionInProgress = false;
        HomesteadGallery.window = $(window);
        HomesteadGallery.slideFromKey = false;
        HomesteadGallery.fullscreenMode = false;
        HomesteadGallery.marginAlreadyCalculated = false;
        HomesteadGallery.modal = document.getElementById('fullscreen');
        HomesteadGallery.modalImg = document.getElementsByClassName('lightbox-content');
        var loadedOnce = false;

        // Init
        var init = function() {

            // Merge user options with the default configuration
            HomesteadGallery.config = $.extend({}, defaults, options);
            
            // Setup
            setup();
            
            // Activate interval
            if (HomesteadGallery.config.autoSlide)
                activateInterval();

            $('#loader').hide();
            $('#gallery').show();
            
            return true;
        };
        
        // Get element
        var getElement = function(obj) {
            var element = {};

            // Get link
            var elementLink = obj.find('a').attr('href');
            if ((typeof elementLink != 'undefined') && (elementLink != '')) {
                element.link = elementLink;
                var elementLinkTarget = obj.find('a').attr('target');
                if ((typeof elementLinkTarget != 'undefined') && (elementLinkTarget != ''))
                    element.linkTarget = elementLinkTarget;
            }

            // Get image 
            var elementThumbnail = obj.find('img').attr('src');
            if ((typeof elementThumbnail != 'undefined') && (elementThumbnail != '')) {
                element.thumbnail = elementThumbnail;
            }

            var elementImage = obj.find('img').attr('data-large-src');
            if ((typeof elementImage != 'undefined') && (elementImage != '')) {
                element.image = elementImage;
            }

            // Get title 
            var elementSpan = obj.find('span').text();
            if ((typeof elementSpan != 'undefined') && (elementSpan != '') && (elementSpan != null)) {
                element.title = elementSpan;
            } else {
                var elementTitle = obj.find('img').attr('alt');
                if ((typeof elementTitle != 'undefined') && (elementTitle != '')) {
                    element.title = elementTitle;
                }
            }

            // Get description
            var elementDescription = obj.find('img').attr('data-description');
            if ((typeof elementDescription != 'undefined') && (elementDescription != ''))
                element.description = elementDescription;

            return element;
        };

        // Update the current height
        var updateHeight = function(height, animate) {

            // Check maxHeight
            if (HomesteadGallery.config.maxHeight) {
                if (HomesteadGallery.plugin.width() > 480 && height > HomesteadGallery.config.maxHeight)
                    height = HomesteadGallery.config.maxHeight;
                else if (HomesteadGallery.plugin.width() <= 480) {
                    if (height + HomesteadGallery.plugin.find('.ps-list').height() > HomesteadGallery.config.maxHeight) {
                        height = HomesteadGallery.config.maxHeight - HomesteadGallery.plugin.find('.ps-list').height();
                    }
                }
            }
                                  
            // Prevents multiple calculations in a short time
            clearTimeout(HomesteadGallery.resizeEvent);
            HomesteadGallery.resizeEvent = setTimeout(function() {
                
                HomesteadGallery.plugin.find('.currentSlide').css('height', height);
                HomesteadGallery.plugin.find('.ps-list > li').css('height', 'auto');
                
                //Adjust Portrait and Panorama Elements
                var query = "(-webkit-min-device-pixel-ratio: 2), (min-device-pixel-ratio: 2), (min-resolution: 192dpi)";
                
                //console.log(!(window.matchMedia(query).matches));
                if (!(window.matchMedia(query).matches)) {
                    //Non high-dpi
                    HomesteadGallery.plugin.find('.portrait').css({ height: elementHeight + (elementHeight / 2) });
                    HomesteadGallery.plugin.find('.panorama').css({ height: elementHeight - (elementHeight / 2) });
                }
                
                // Vertical alignment
                if (HomesteadGallery.config.verticalCentering) {
                    
                    // Current elements
                    HomesteadGallery.plugin.find('.currentSlide > ul > li').each(function(){
                        var isVisible = ($(this).css('display') == 'none') ? false : true;

                        if (!isVisible)
                            $(this).show();

                        if ($(this).find('img').height() > height) {
                            var imageMargin = Math.round(($(this).find('img').height() - height) / 2);
                            $(this).find('img').css('margin-top', -imageMargin);
                        } else if ($(this).find('img').height() <= height) {
                            var imageMargin = Math.round((height - $(this).find('img').height()) / 2);
                            $(this).find('img').css('margin-top', imageMargin);
                            console.log($(this).find('img').height()+", "+height+", "+imageMargin);
                        } else
                            $(this).find('img').css('margin-top', '');

                        if (!isVisible)
                            $(this).hide();
                    });
                }
                
            }, 100);

            return true;
        };

        // Set size class
        var setSizeClass = function() {

            if (HomesteadGallery.plugin.width() <= 480)
                HomesteadGallery.plugin.addClass('narrow').removeClass('wide');
            else
                HomesteadGallery.plugin.addClass('wide').removeClass('narrow');

            return true;
        };

        // Setup
        var setup = function() {

            // Create container
            HomesteadGallery.plugin.removeClass(HomesteadGallery.config.mainClassName).addClass('ps-list');
            HomesteadGallery.plugin.wrap('<div class="' + HomesteadGallery.config.mainClassName + '"></div>');
            HomesteadGallery.plugin = HomesteadGallery.plugin.parent();
            HomesteadGallery.plugin.prepend('<div class="currentSlide"><ul></ul><span class="ps-caption"></span></div>');
            HomesteadGallery.slideCount = HomesteadGallery.plugin.find('.ps-list > li').length;

            if (HomesteadGallery.slideCount == 0) {
                throw new Error('HomesteadGallery - No slider item has been found');
                return false;
            }

            // Add arrows and ability to navigate
            if (HomesteadGallery.config.displayControls && HomesteadGallery.slideCount > 1) {
                HomesteadGallery.plugin.find('.currentSlide').prepend('<span class="prev">&#10094;</span>');
                HomesteadGallery.plugin.find('.currentSlide').append('<span class="next">&#10095;</span>');
                
                HomesteadGallery.plugin.find('.currentSlide .prev').click(function() {
                    HomesteadGallery.previousSlide();
                });
                HomesteadGallery.plugin.find('.currentSlide .next').click(function() {
                    HomesteadGallery.slideFromKey = true;
                    HomesteadGallery.nextSlide();
                    HomesteadGallery.slideFromKey = false;
                });
                
                document.onkeydown = function(e) {
                    if (e.keyCode == 37)  // Left arrow key maps to keycode '37'
                        HomesteadGallery.previousSlide();
                        
                    else if (e.keyCode == 39) {  // Right arrow key maps to keycode '39'
                        HomesteadGallery.slideFromKey = true;
                        HomesteadGallery.nextSlide();
                        HomesteadGallery.slideFromKey = false;
                    }
                };
            }

            // Disable list
            if (! HomesteadGallery.config.displayList) {
                HomesteadGallery.plugin.find('.currentSlide').css('width', '100%');
                HomesteadGallery.plugin.find('.ps-list').hide();
            }
            
            // Get slider elements
            var elementId = 1;
            HomesteadGallery.plugin.find('.ps-list > li').each(function() {
                var element = getElement($(this));
                element.id = elementId;
                HomesteadGallery.data.push(element);
                
                $(this).addClass('elt_' + element.id);
                currentListElement = $(this);

                // Check element title
                if (element.title) {
                    if ($(this).find('span').length == 1) {
                        if ($(this).find('span').text() == '') {
                            $(this).find('span').text(element.title);
                        }
                    } else
                        $(this).find('img').after('<span>' + element.title + '</span>');
                }

                // Set element in the current list
                var currentElement = $('<li class="elt_' + elementId + '"></li>');
                
                if (element.image)
                    currentElement.html('<img src="' + element.image + '" alt="' + (element.title ? element.title : '') + '">');
                else if (element.thumbnail)
                    currentElement.html('<img src="' + element.thumbnail + '" alt="' + (element.title ? element.title : '') + '">');

                if (element.link)
                    currentElement.html('<a href="' + element.link + '"' + (element.linkTarget ? ' target="' + element.linkTarget + '"' : '') + '>' + currentElement.html() + '</a>');
                
                HomesteadGallery.plugin.find('.currentSlide > ul').append(currentElement);
                                
                // Set selection mode
                if ((HomesteadGallery.config.selectionMode == 'mouseOver') && (HomesteadGallery.config.transitionEffect == 'fading')) {
                    $(this).css('cursor', 'default').click(function(event) {
                        event.preventDefault();
                    }).bind('mouseenter', function(event) {
                        displayElement(element.id);
                    });
                    $(this).find('a').css('cursor', 'default');
                } else {
                    $(this).css('cursor', 'pointer').click(function(event) {
                        event.preventDefault();
                        scrollList(element, 500);
                        displayElement(element.id);
                    });
                }
                
                ++elementId;
            });

            // Set list position
            if (HomesteadGallery.config.listPosition == 'left')
                HomesteadGallery.plugin.addClass('listOnTheLeft');

            // Attach slide events
            if (HomesteadGallery.config.autoSlide) {
                HomesteadGallery.plugin.on('mouseenter', function() {
                    clearInterval(HomesteadGallery.intervalEvent);
                    HomesteadGallery.intervalEvent = null;
                }).on('mouseleave', function() {
                    activateInterval();
                });
            }

            // Display the first element
            displayElement(1);
            var initMaxHeight;
            
            // Set the first height
            HomesteadGallery.plugin.find('.currentSlide > ul > li.elt_1 img').on('load', function() {
                setSizeClass();

                var maxHeight = HomesteadGallery.plugin.find('.currentSlide > ul > li.elt_1 img').height();
                initMaxHeight = maxHeight;
                updateHeight(maxHeight);
                HomesteadGallery.plugin.find('.ps-list').css('max-height', maxHeight);

                HomesteadGallery.window.resize(function() {
                    // The new class must be set before the recalculation of the height.
                    setSizeClass();
                    
                    if (!HomesteadGallery.plugin.find('.currentSlide').hasClass('portrait') || !HomesteadGallery.plugin.find('.currentSlide').hasClass('panorama'))
                        var maxHeight = HomesteadGallery.plugin.find('.currentSlide > ul > li.elt_' + HomesteadGallery.currentSlide + ' img').height();
                    else
                        var maxHeight = initMaxHeight;
                    updateHeight(maxHeight, HomesteadGallery.config.adaptiveHeight);
                    HomesteadGallery.plugin.find('.ps-list').css('max-height', maxHeight);
                });
            });
            
            // Touch controls for current image
            if (HomesteadGallery.config.touchControls && HomesteadGallery.slideCount > 1) {

                HomesteadGallery.plugin.find('.currentSlide').on('touchstart', function(e) {                    
                    try {
                        if (e.originalEvent.touches[0].clientX && e.originalEvent.touches.length == 1 && HomesteadGallery.touchFirstPosition == null)
                            HomesteadGallery.touchFirstPosition = e.originalEvent.touches[0].clientX;
                    } catch(e) {
                        HomesteadGallery.touchFirstPosition = null;
                    }
                });

                HomesteadGallery.plugin.find('.currentSlide').on('touchmove', function(e) {
                    try {
                        if (e.originalEvent.touches[0].clientX && e.originalEvent.touches.length == 1 && HomesteadGallery.touchFirstPosition != null) {
                            if (e.originalEvent.touches[0].clientX > (HomesteadGallery.touchFirstPosition + 50)) {
                                HomesteadGallery.touchFirstPosition = null;
                                HomesteadGallery.previousSlide();
                            } else if (e.originalEvent.touches[0].clientX < (HomesteadGallery.touchFirstPosition - 50)) {
                                HomesteadGallery.touchFirstPosition = null;
                                HomesteadGallery.nextSlide();
                            }
                        }
                    } catch(e) {
                        HomesteadGallery.touchFirstPosition = null;
                    }
                });

                HomesteadGallery.plugin.find('.currentSlide').on('touchend', function(e) {
                    HomesteadGallery.touchFirstPosition = null;
                });
            }
            
            HomesteadGallery.plugin.find('.ps-list > li').each(function() {
                if ($(this)[0].children[0].height > $(this)[0].children[0].width) {
                $(this).addClass('portrait');
                //console.log($(this));
                //currentElement.addClass('portrait');
                }
                
                if (($(this)[0].children[0].height * 3) <= $(this)[0].children[0].width) {
                    $(this).addClass('panorama');
                    //currentElement.addClass('panorama');                
                }
            });

            return true;
        };

        // Finish element
        var finishElement = function(element) {

            // Element caption
            var elementText = '';
            if (element.title)
                elementText += '<b>' + element.title + '</b>';

            if (element.description) {
                if (elementText != '') elementText += '<br>';
                    elementText += element.description;
            }

            if (elementText != '') {
                if (element.link)
                    elementText = '<a href="' + element.link + '"' + (element.linkTarget ? ' target="' + element.linkTarget + '"' : '') + '>' + elementText + '</a>';

                if (typeof HomesteadGallery.plugin.find('.ps-caption').fadeIn == 'function') {
                    HomesteadGallery.plugin.find('.ps-caption').html(elementText);
                    HomesteadGallery.plugin.find('.ps-caption').fadeIn(HomesteadGallery.config.transitionDuration / 2);
                } else {
                    HomesteadGallery.plugin.find('.ps-caption').html(elementText);
                    HomesteadGallery.plugin.find('.ps-caption').show();
                }
            }

            // Slider controls
            if (HomesteadGallery.config.displayControls) {
                if (typeof HomesteadGallery.plugin.find('.currentSlide > .prev').fadeIn == 'function')
                    HomesteadGallery.plugin.find('.currentSlide > .prev, .currentSlide > .next').fadeIn(HomesteadGallery.config.transitionDuration / 2);
                else
                    HomesteadGallery.plugin.find('.currentSlide > .prev, .currentSlide > .next').show();
            }

            // After slide
            if (typeof HomesteadGallery.config.afterSlide == 'function')
                HomesteadGallery.config.afterSlide(element.id);
            
            // Set the container height
            if (HomesteadGallery.config.adaptiveHeight) {
                var maxHeight = HomesteadGallery.plugin.find('.currentSlide .elt_' + element.id + ' img').height();
                updateHeight(maxHeight, true);
                HomesteadGallery.plugin.find('.ps-list').css('max-height', maxHeight);
            }
            
            lightbox(element);
            
            return true;
        }
        
        var lightbox = function(element) {
            
            // Get the image and insert it inside the modal
            var elementContainer = HomesteadGallery.plugin.find('.currentSlide > ul');
            var img = elementContainer.find('.elt_' + element.id + ' img');
            
            img[0].onclick = function() {
                if (HomesteadGallery.fullscreenMode == false)  {
                    HomesteadGallery.fullscreenMode = true;
                    $('header, .mk-post-nav').css('z-index', '0');
                    
                    if ($('#gallery').hasClass('animate-bottom'))
                        $('#gallery').removeClass('animate-bottom');
                    
                    //Hide list and extend slide
                    if (HomesteadGallery.plugin.width() <= 480)
                        HomesteadGallery.plugin.addClass('wide').removeClass('narrow');
                    
                    var initHeight = HomesteadGallery.plugin.find('.currentSlide').height();
                    
                    HomesteadGallery.plugin.find('.currentSlide').css('height', '').toggleClass('lightbox-content');
                    
                    var height = HomesteadGallery.plugin.find('.currentSlide').height();
                    
                    HomesteadGallery.plugin.find('.currentSlide > ul > li').each(function(){
                        var isVisible = ($(this).css('display') == 'none') ? false : true;

                        if (!isVisible)
                            $(this).show();

                        if ($(this).show().find('img').height() > height) {
                            var imageMargin = Math.round(($(this).find('img').height() - height) / 2);
                            $(this).find('img').css('margin-top', -imageMargin);
                        }  if ($(this).show().find('img').height() < height) {
                            var imageMargin = Math.round((height - $(this).find('img').height()) / 2);
                            $(this).find('img').css('margin-top', imageMargin);
                            
                        } else
                            $(this).find('img').css('margin-top', '');

                        if (!isVisible)
                            $(this).hide();
                    });
                    
                    HomesteadGallery.plugin.find('.ps-list').hide();
                    HomesteadGallery.modal.style.display = "block";
                    
                    if ($(this).height() > screen.height)
                        $(this).css('width', 'auto').css('height', screen.height).addClass('heightChanged');
                    
                    // Get the <span> element that closes the modal
                    var span = document.getElementsByClassName("close")[0];
                    span.style.display = "block";
                                                    
                    var snackbar = document.getElementById("snackbar");
                    var snackbarTimeout;
                    
                    // Add the "show" class to DIV
                    snackbar.className = "show";

                    // After 3 seconds, remove the show class from DIV
                    snackbarTimeout = setTimeout(function(){ snackbar.className = snackbar.className.replace("show", ""); }, 3000);
                    
                    // Click ESC to close modal, if modal present
                    document.onkeydown = function(e) {
                        if (e.keyCode == 27 && HomesteadGallery.modal.style.display == "block") { // escape key maps to keycode `27`
                            
                            HomesteadGallery.plugin.find('.currentSlide').toggleClass('lightbox-content');
                            
                            if (HomesteadGallery.plugin.width() <= 480)
                                HomesteadGallery.plugin.addClass('narrow').removeClass('wide');
                            
                            HomesteadGallery.plugin.find('.currentSlide > ul > li').each(function(){
                                if (HomesteadGallery.plugin.find('.currentSlide img').hasClass('heightChanged'))
                                    HomesteadGallery.plugin.find('.currentSlide img').css('width', '').css('height', '');
                            });
                            
                            HomesteadGallery.plugin.find('.currentSlide')
                                .css('max-width', '')
                                .css('max-height', '')
                                .css('width', '')
                                .css('position', '')
                                .css('bottom', '')
                                .css('left', '')
                                .css('right', '')
                                .css('top', '')
                                .css('height', initHeight + 'px')
                                .css('cursor', 'pointer');
                            
                            HomesteadGallery.plugin.find('.currentSlide > ul > li').each(function(){
                                $(this).find('img').css('margin-top', '');
                            });
                            
                            HomesteadGallery.plugin.find('.ps-list').show();
                            HomesteadGallery.modal.style.display = "none";
                            span.style.display = "none";
                                          
                            if (snackbar.className == "show") {
                                snackbar.className = snackbar.className.replace("show", "");
                                clearTimeout(snackbarTimeout);
                            }
                            
                            HomesteadGallery.fullscreenMode = false;
		                    $('header, .mk-post-nav').css('z-index', '301');
                            
                        } else if (e.keyCode == 37) {// Left arrow key maps to keycode '37'
                              HomesteadGallery.previousSlide();
                              
                              if (elementContainer.find('.elt_' + HomesteadGallery.getCurrentSlide() + ' img').height() > screen.height)
                                  elementContainer.find('.elt_' + HomesteadGallery.getCurrentSlide() + ' img').css('width', 'auto').css('height', screen.height).addClass('heightChanged');
                        }
                          else if (e.keyCode == 39) { // Right arrow key maps to keycode '39'
                              HomesteadGallery.slideFromKey = true;
                              HomesteadGallery.nextSlide();
                              HomesteadGallery.slideFromKey = false;
                              
                              if (elementContainer.find('.elt_' + HomesteadGallery.getCurrentSlide() + ' img').height() > screen.height)
                                  elementContainer.find('.elt_' + HomesteadGallery.getCurrentSlide() + ' img').css('width', 'auto').css('height', screen.height).addClass('heightChanged');
                        }
                    };

                    // When the user clicks on <span> (x), close the modal
                    span.onclick = function() { 
                    
                        HomesteadGallery.plugin.find('.currentSlide').toggleClass('lightbox-content');
                    
                        if (HomesteadGallery.plugin.width() <= 480)
                            HomesteadGallery.plugin.addClass('narrow').removeClass('wide');
                        
                        HomesteadGallery.plugin.find('.currentSlide > ul > li').each(function(){
                            if (HomesteadGallery.plugin.find('.currentSlide img').hasClass('heightChanged'))
                                HomesteadGallery.plugin.find('.currentSlide img').css('width', '').css('height', '');
                        });
                        
                        HomesteadGallery.plugin.find('.currentSlide')
                            .css('max-width', '')
                            .css('max-height', '')
                            .css('width', '')
                            .css('position', '')
                            .css('bottom', '')
                            .css('left', '')
                            .css('right', '')
                            .css('top', '')
                            .css('height', initHeight + 'px')
                            .css('cursor', 'pointer');
                        
                        HomesteadGallery.plugin.find('.currentSlide > ul > li').each(function(){
                            $(this).find('img').css('margin-top', '');
                        });
                        
                        HomesteadGallery.plugin.find('.ps-list').show();
                        HomesteadGallery.modal.style.display = "none";
                        span.style.display = "none";
                        HomesteadGallery.fullscreenMode = false;
	                    $('header, .mk-post-nav').css('z-index', '301');
                    }
                }
            };
        }

        // Fade an element
        var fadeElement = function(element) {
            var elementContainer = HomesteadGallery.plugin.find('.currentSlide > ul');

            // Update list items
            HomesteadGallery.plugin.find('.ps-list > li').css('opacity', '0.6');
            HomesteadGallery.plugin.find('.ps-list > li.elt_' + element.id).css('opacity', '1');

            elementContainer.find('li').not('.elt_' + HomesteadGallery.currentSlide).not('.elt_' + element.id).each(function(){
                if (typeof $(this).stop == 'function')
                    $(this).stop();
                $(this).css('position', '').css('z-index', 1).hide();
            });

            // Current element
            if (HomesteadGallery.currentSlide > 0) {
                var currentElement = elementContainer.find('.elt_' + HomesteadGallery.currentSlide);

                if (typeof currentElement.animate != 'function') {
                    currentElement.animate = function(css, duration, callback) {
                        currentElement.css(css);
                        if (callback)
                            callback();
                    };
                }

                if (typeof currentElement.stop == 'function')
                    currentElement.stop();

                currentElement.css('position', 'absolute').animate({
                    opacity : 0,
                }, HomesteadGallery.config.transitionDuration, function() {
                    currentElement.css('position', '').css('z-index', 1).hide();
                });
            }
            
            // Update current id
            HomesteadGallery.currentSlide = element.id;

            // Next element
            var nextElement = elementContainer.find('.elt_' + element.id);

            if (typeof nextElement.animate != 'function') {
                nextElement.animate = function(css, duration, callback) {
                    nextElement.css(css);
                    if (callback)
                        callback();
                };
            }

            if (typeof nextElement.stop == 'function')
                nextElement.stop();

            nextElement.css('position', 'absolute').show().animate({
                opacity : 1,
            }, HomesteadGallery.config.transitionDuration, function() {
                nextElement.css('position', '').css('z-index', 2).show();
                finishElement(element);
            });

            return true;
        }

        // Slide an element
        var slideElement = function(element, direction) {
            var elementContainer = HomesteadGallery.plugin.find('.currentSlide > ul');

            if (typeof direction == 'undefined')
                direction = 'left';

            scrollList(element, 500);
            
            if (HomesteadGallery.currentSlide == 0) {
                elementContainer.find('.elt_1').css({
                    position: '',
                    left: '',
                    opacity: 1,
                    'z-index': 2
                }).show();
                HomesteadGallery.plugin.find('.ps-list > li.elt_1').css('opacity', '1');
                finishElement(element);

            } else {

                if (HomesteadGallery.transitionInProgress)
                    return false;

                HomesteadGallery.transitionInProgress = true;

                // Get direction details
                var elementWidth = elementContainer.width();

                if (direction == 'left') {
                    var elementDest = -elementWidth;
                    var nextOrigin = elementWidth;
                } else {
                    var elementDest = elementWidth;
                    var nextOrigin = -elementWidth;
                }

                /***/
                var currentElement = elementContainer.find('.elt_' + HomesteadGallery.currentSlide);
                var height = HomesteadGallery.plugin.find('.currentSlide').height();
                
                if (currentElement.height() > height) {
                    var imageMargin = Math.round((currentElement.height() - height) / 2);
                    currentElement.css('margin-top', -imageMargin);
                }  if (currentElement.height() <= height) {
                    var imageMargin = Math.round((height - currentElement.height()) / 2);
                    currentElement.css('margin-top', imageMargin);
                    console.log(currentElement.height()+", "+height+", "+imageMargin);
                } else
                    currentElement.css('margin-top', '');
                
                if (typeof currentElement.animate != 'function') {
                    currentElement.animate = function(css, duration, callback) {
                        currentElement.css(css);
                        if (callback)
                            callback();
                    };
                }

                currentElement.css('position', 'absolute').animate({
                    left : elementDest,
                }, HomesteadGallery.config.transitionDuration, function() {
                    currentElement.css('position', '').css('z-index', 1).css('left', '').css('opacity', 0).hide();
                });

                // Next element
                var nextElement = elementContainer.find('.elt_' + element.id);
                
                if (typeof nextElement.animate != 'function') {
                    nextElement.animate = function(css, duration, callback) {
                        nextElement.css(css);
                        if (callback)
                            callback();
                    };
                }
                            
                nextElement.css('position', 'absolute').css('left', nextOrigin).css('opacity', 1).show().animate({
                    left : 0,
                }, HomesteadGallery.config.transitionDuration, function() {
                    nextElement.css('position', '').css('left', '').css('z-index', 2).show();
                    HomesteadGallery.transitionInProgress = false;

                    // Display new element
                    HomesteadGallery.plugin.find('.ps-list > li').css('opacity', '0.6');
                    HomesteadGallery.plugin.find('.ps-list > li.elt_' + element.id).css('opacity', '1');
                    
                    finishElement(element);
                });
            }

            // Update current id
            HomesteadGallery.currentSlide = element.id;

            return true;
        }

        // Display the current element
        var displayElement = function(elementId, apiController, direction) {

            if (elementId == HomesteadGallery.currentSlide)
                return false;

            var element = HomesteadGallery.data[elementId - 1];

            if (typeof element == 'undefined') {
                throw new Error('HomesteadGallery - The element ' + elementId + ' is undefined');
                return false;
            }

            if (typeof direction == 'undefined')
                direction = 'left';
 
            // currentSlide here is actually the previous slide
            if (elementId < HomesteadGallery.currentSlide && elementId != 1)
                direction = 'right'; 
            
            if (elementId == 1 && HomesteadGallery.slideFromKey)
                direction = 'left';
            else if (elementId < HomesteadGallery.currentSlide && elementId == 1)
                direction = 'right';
            
            // Before slide
            if (typeof HomesteadGallery.config.beforeSlide == 'function')
                HomesteadGallery.config.beforeSlide(elementId);

            if (typeof HomesteadGallery.plugin.find('.ps-caption').fadeOut == 'function')
                HomesteadGallery.plugin.find('.ps-caption, .prev, .next').fadeOut(HomesteadGallery.config.transitionDuration / 2);
            else
                HomesteadGallery.plugin.find('.ps-caption, .prev, .next').hide();

            // Choose the transition effect
            if (HomesteadGallery.config.transitionEffect == 'sliding')
                slideElement(element, direction);
            else
                fadeElement(element);

            // Reset interval to avoid a half interval after an API control
            if (typeof apiController != 'undefined' && HomesteadGallery.config.autoSlide)
                activateInterval();
            
            return true;
        };

        // Activate interval
        var activateInterval = function() {
            clearInterval(HomesteadGallery.intervalEvent);

            if (HomesteadGallery.slideCount > 1 && HomesteadGallery.config.autoSlide) {
                HomesteadGallery.intervalEvent = setInterval(function() {
                    if (HomesteadGallery.currentSlide + 1 <= HomesteadGallery.slideCount)
                        var nextItem = HomesteadGallery.currentSlide + 1;
                    else
                        var nextItem = 1;
                    
                    displayElement(nextItem);
                }, HomesteadGallery.config.intervalDuration);
            }

            return true;
        };
        
        // Start auto slide
        HomesteadGallery.startSlide = function() {
            HomesteadGallery.config.autoSlide = true;
            activateInterval();
            return true;
        };

        // Stop auto slide
        HomesteadGallery.stopSlide = function() {
            HomesteadGallery.config.autoSlide = false;
            clearInterval(HomesteadGallery.intervalEvent);
            return true;
        };

        // Get current slide
        HomesteadGallery.getCurrentSlide = function() {
            return HomesteadGallery.currentSlide;
        };

        // Get slide count
        HomesteadGallery.getSlideCount = function() {
            return HomesteadGallery.slideCount;
        };
        
        HomesteadGallery.isSlideFromKey = function() {
            return HomesteadGallery.slideFromKey;
        };

        // Display slide
        HomesteadGallery.displaySlide = function(itemId) {
            displayElement(itemId, true);
            return true;
        };
        
        scrollList = function(element, durationInMillis) {
            $('#gallery').animate({
                scrollTop: /*Scroll to Center*/ $(HomesteadGallery.plugin.find('.ps-list > li.elt_' + element.id)).offset().top - $('#gallery').offset().top + $('#gallery').scrollTop() - (($('#gallery').height() / 2) - ($(HomesteadGallery.plugin.find('.ps-list > li.elt_' + element.id)).height() / 2))
                /*Scroll to Top*/ //$(this).offset().top - $('#gallery').offset().top + $('#gallery').scrollTop()
            }, durationInMillis);
        };
        
        function isHighDensity(){
            return ((window.matchMedia && (window.matchMedia('only screen and (min-resolution: 124dpi), only screen and (min-resolution: 1.3dppx), only screen and (min-resolution: 48.8dpcm)').matches || window.matchMedia('only screen and (-webkit-min-device-pixel-ratio: 1.3), only screen and (-o-min-device-pixel-ratio: 2.6/2), only screen and (min--moz-device-pixel-ratio: 1.3), only screen and (min-device-pixel-ratio: 1.3)').matches)) || (window.devicePixelRatio && window.devicePixelRatio > 1.3));
        }


        function isRetina(){
            return ((window.matchMedia && (window.matchMedia('only screen and (min-resolution: 192dpi), only screen and (min-resolution: 2dppx), only screen and (min-resolution: 75.6dpcm)').matches || window.matchMedia('only screen and (-webkit-min-device-pixel-ratio: 2), only screen and (-o-min-device-pixel-ratio: 2/1), only screen and (min--moz-device-pixel-ratio: 2), only screen and (min-device-pixel-ratio: 2)').matches)) || (window.devicePixelRatio && window.devicePixelRatio >= 2)) && /(iPad|iPhone|iPod)/g.test(navigator.userAgent);
        }

        // Next slide
        HomesteadGallery.nextSlide = function() {
            if (HomesteadGallery.currentSlide + 1 <= HomesteadGallery.slideCount)
                var nextItem = HomesteadGallery.currentSlide + 1;
            else
                var nextItem = 1;
            
            /*var height = HomesteadGallery.plugin.find('.currentSlide > ul > li.elt_1 img').height();
            
            if (!loadedOnce) {
                var currentElement = elementContainer.find('.elt_' + HomesteadGallery.currentSlide);
                var height = HomesteadGallery.plugin.find('.currentSlide').height();
                
                if (currentElement.height() > height) {
                    var imageMargin = Math.round((currentElement.height() - height) / 2);
                    currentElement.css('margin-top', -imageMargin);
                }  if (currentElement.height() <= height) {
                    var imageMargin = Math.round((height - currentElement.height()) / 2);
                    currentElement.css('margin-top', imageMargin);
                    console.log(currentElement.height()+", "+height+", "+imageMargin);
                } else
                    currentElement.css('margin-top', '');
            }*/
            
            displayElement(nextItem, true, 'left');
            return true;
        };
               
        // Previous slide
        HomesteadGallery.previousSlide = function() {
            if (HomesteadGallery.currentSlide - 1 >= 1)
                var previousItem = HomesteadGallery.currentSlide - 1;
            else
                var previousItem = HomesteadGallery.slideCount;
                     
            displayElement(previousItem, true, 'right');
            return true;
        };
              
        // Destroy slider
        HomesteadGallery.destroy = function(soft) {
            clearInterval(HomesteadGallery.intervalEvent);

            if (typeof soft != 'undefined') {
                HomesteadGallery.plugin.find('.ps-list > li').each(function() {
                    $(this).attr('style', null).removeClass().css('cursor', '').unbind('click').unbind('mouseenter');
                    $(this).find('a').css('cursor', '');
                    $(this).find('img').attr('style', null);
                });

                HomesteadGallery.plugin.find('.ps-list').addClass(HomesteadGallery.config.mainClassName).removeClass('ps-list');
                HomesteadGallery.plugin.find('.currentSlide').unwrap().remove();
                HomesteadGallery.hide();

            } else
                HomesteadGallery.parent().remove();

            HomesteadGallery.plugin = null;
            HomesteadGallery.data = [];
            HomesteadGallery.config = {};
            HomesteadGallery.currentSlide = 0;
            HomesteadGallery.slideCount = 0;
            HomesteadGallery.resizeEvent = null;
            HomesteadGallery.intervalEvent = null;
            HomesteadGallery.touchFirstPosition = null;
            HomesteadGallery.transitionInProgress = false;
            HomesteadGallery.window = null;

            return true;
        };

        // Reload slider
        HomesteadGallery.reload = function(newOptions) {
            HomesteadGallery.destroy(true);

            HomesteadGallery = this;
            HomesteadGallery.plugin = this;
            HomesteadGallery.window = $(window);
            HomesteadGallery.plugin.show();

            // Merge new options with the default configuration
            HomesteadGallery.config = $.extend({}, defaults, newOptions);

            // Setup
            setup();

            // Activate interval
            if (HomesteadGallery.config.autoSlide)
                activateInterval();

            return true;
        };

        // Slider initialization
        init();

        return this;
    }
})(window.Zepto || window.jQuery);