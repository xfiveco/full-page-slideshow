/*global jQuery, Backbone*/

(function ($) {
  'use strict';

  var FullPageSlideshow = function (props) {
    this.arrPagination = [];
    this.arrVisitedSections = [];
    this.isAnimated = false;

    this.$container = $(props.containerSelector);
    this.downButtonsSelector = props.downButtonsSelector;
    this.upButtonsSelector = props.upButtonsSelector;
    this.duration = props.duration || 300;
    this.preserveScrollSelector = props.preserveScrollSelector;
    this.isPaginationAllowOnlyVisited = props.isPaginationAllowOnlyVisited;
    this.paginationNamespace = props.paginationNamespace;
    this.currentSectionIndex = props.currentSection || 0;
    this.prevSectionIndex = props.prevSection || 0;
    this.paginatedSectionsSelector = props.paginatedSectionsSelector;
    this.jumpToSelector = props.jumpToSelector;
    this.scrollOffsetSelector = props.scrollOffsetSelector;
    this.checkActiveLinksInterval = props.checkActiveLinksInterval || 300;
    this.isEnableKeyboardArrows = props.isEnableKeyboardArrows;
    this.validateSectionsCallback = props.validateSectionsCallback;
    this.validationResultSelector = props.validationResultSelector;

    this.$sections = this.$container.children();
    this.sectionsLength = this.$sections.length;
    this.paginationTriggerSelector = '.' + this.paginationNamespace + '-trigger';
    this.$pagination = this.createPagination();
    this.$paginationTriggers = this.$pagination.find(this.paginationTriggerSelector);
    this.$jumpToLinks = $(this.jumpToSelector);

    this.router = new this.routerSetup();
  };

  FullPageSlideshow.prototype = {
    counter: 0,
    $doc: $(document),
    $win: $(window),
    $htmlBody: $('html, body'),

    routerSetup: Backbone.Router.extend({
      routes: {
        'section/:targetSelector': 'setSection'
      }
    }),

    createPagination: function () {
      var markup = '';

      markup += '<ul class="' + this.paginationNamespace + '">';

      this.$sections.each(function (index, section) {
        if ( !$(section).is(this.paginatedSectionsSelector) ) { return; }

        this.arrPagination.push(index);
        var no = index-1;

        markup += '<li class="' + this.paginationNamespace + '-item">';
        markup += ' <button';
        markup += '   class="' + this.paginationNamespace + '-trigger"';
        markup += '   data-ref=' + index;
        markup += '>';
        markup += '   Section ' + index;
        markup += ' </button>';
        markup += ' <span class="pagination-label">Q'+no+'</span> ';
        markup += '</li>';
      }.bind(this));

      markup += '</ul>';

      return $(markup).appendTo(this.$container);
    },

    updatePagination: function () {
      this.addToVisited();

      var indexOfCurrentSection = this.arrPagination.indexOf(this.currentSectionIndex);

      this.$paginationTriggers.addClass('not-active').removeClass('active');

      this.$paginationTriggers.filter(function (index, paginationTrigger) {
        var $paginationTrigger = $(paginationTrigger);

        return (
          this.arrVisitedSections.indexOf( $paginationTrigger.data('ref') ) !== -1 &&
          !$paginationTrigger.hasClass('visited')
        );
      }.bind(this)).addClass('visited');

      if (indexOfCurrentSection !== -1) {
        this.$pagination.removeClass('not-active').addClass('active');

        this.$paginationTriggers
          .eq(indexOfCurrentSection)
          .removeClass('not-active')
          .addClass('active');
      } else {
        this.$pagination.removeClass('active').addClass('not-active');
      }
    },

    addToVisited: function () {
      if ( this.arrVisitedSections.indexOf(this.currentSectionIndex) !== -1 ) { return; }
      this.arrVisitedSections.push(this.currentSectionIndex);
    },

    selectorToIndex: function (selector) {
      var index = -1;

      this.$sections.each(function (thisIndex, section) {
        var $section = $(section);

        if ( $section.find(selector).length || $section.is(selector) ) {
          index = thisIndex;
        }
      });

      return index;
    },

    animate: function () {
      this.isAnimated = true;

      var deferred = $.Deferred();
      var prevTopVal;
      var activeTopVal;
      var $preserveScroll;
      var scrollTop = this.$win.scrollTop();
      var containerHeight = this.$container.outerHeight();

      if (this.prevSectionIndex < this.currentSectionIndex) {
        prevTopVal = -1;
        activeTopVal = 1;
      }

      if (this.prevSectionIndex > this.currentSectionIndex) {
        prevTopVal = 1;
        activeTopVal = -1;
      }

      this.$doc.trigger('full-page-scroll.animation-start', [this.$currentSection, this.prevSectionIndex]);

      if (this.preserveScrollSelector) {
        $preserveScroll = this.$prevSection.find(this.preserveScrollSelector);
        $preserveScroll.css('top', -scrollTop);
      }

      this.$container.addClass('lock');

      this.$notActiveSections.removeClass('active');
      this.$currentSection.removeClass('not-active').addClass('off-screen');

      this.$currentSection.velocity({
        translateY: [0, activeTopVal * containerHeight]
      }, this.duration, 'easeInSine', function () {
        $preserveScroll.css('top', '');
        this.$currentSection.removeClass('off-screen').addClass('active');
      }.bind(this));

      this.$prevSection.velocity({
        translateY: [prevTopVal * containerHeight, 0]
      }, this.duration, 'easeInSine', function () {
        this.$notActiveSections.addClass('not-active');
        this.$prevSection.css({
          top: '',
          height: ''
        });
        this.$container.removeClass('lock');
        this.$doc.trigger('full-page-scroll.animation-end', [this.$currentSection, this.prevSectionIndex]);
        deferred.resolve();
        this.isAnimated = false;
      }.bind(this));

      return deferred;
    },

    setSection: function (isTransition) {
      this.$notActiveSections = this.$sections.filter(function (thisIndex) {
        return thisIndex !== this.currentSectionIndex;
      }.bind(this));

      this.$prevSection = this.$sections.eq(this.prevSectionIndex);
      this.$currentSection = this.$sections.eq(this.currentSectionIndex);

      if (isTransition && this.prevSectionIndex !== this.currentSectionIndex) {
        this.animate();
      } else {
        this.$notActiveSections.removeClass('active').addClass('not-active');
        this.$currentSection.removeClass('not-active').addClass('active');
      }

      this.updatePagination();
    },

    addValidClass: function () {
      clearTimeout(this.removeValidClassTimer);

      this.$currentSection.find(this.validationResultSelector)
        .removeClass('invalid')
        .addClass('valid');
    },

    removeValidClass: function () {
      clearTimeout(this.removeValidClassTimer);

      var $validationResults = this.$currentSection.find(this.validationResultSelector);

      $validationResults
        .removeClass('valid')
        .addClass('invalid-signal')
        .addClass('invalid');

      this.removeValidClassTimer = setTimeout(function () {
        $validationResults.removeClass('invalid-signal');
      }, 800);
    },

    validateSections: function (nextIndex) {
      if (!this.$currentSection) { return true; }
      if (nextIndex < this.currentSectionIndex) { return true; }

      if (this.validateSectionsCallback) {
        if ( this.validateSectionsCallback.call(this, this.$currentSection) ) {
          if (this.validationResultSelector) { this.addValidClass(); }
          return true;
        } else {
          if (this.validationResultSelector) { this.removeValidClass(); }
          return false;
        }
      }

      return true;
    },

    jumpTo: function (index) {
      if ( this.isAnimated || index < 0 || !this.validateSections(index) ) { return; }
      this.prevSectionIndex = this.currentSectionIndex;
      this.currentSectionIndex = index;
      this.setSection(true);
    },

    pageUp: function () {
      if (this.currentSectionIndex - 1 < 0) { return; }
      this.jumpTo(this.currentSectionIndex - 1);
    },

    pageDown: function () {
      if (this.currentSectionIndex + 1 >= this.sectionsLength) { return; }
      this.jumpTo(this.currentSectionIndex + 1);
    },

    setMinHeight: function () {
      var height = this.$container.height();
      this.$sections.css('min-height', height);
    },

    calculateOffset: function () {
      if (!this.scrollOffsetSelector) { return 0; }

      var $els = $(this.scrollOffsetSelector);
      var offset = 0;

      $els.each(function (index, el) { offset += $(el).outerHeight(); });

      return offset * -1;
    },

    scrollTo: function (selector) {
      var $target = this.$currentSection.find(selector);
      var decimalPlacesOffset = 0;

      if ($target.length) { decimalPlacesOffset = $target.offset().top % 1; }

      var offset = this.calculateOffset() + decimalPlacesOffset;

      this.$doc.trigger('full-page-scroll.scroll-to-start');

      this.$currentSection
        .find(selector)
        .velocity('stop')
        .velocity('scroll', {
          duration: 500,
          easing: 'easeOutSine',
          offset: offset,
          complete: function () {
            this.$doc.trigger('full-page-scroll.scroll-to-start');
          }.bind(this)
        });
    },

    detectActiveJumpToLinks: function () {
      if (!this.jumpToSelector) { return; }
      setTimeout( this.detectActiveJumpToLinks.bind(this), this.checkActiveLinksInterval );

      var scrollTop = this.$win.scrollTop();
      var arrActive = [];
      var smallestVal = 0;

      this.$jumpToLinks.each(function (index, el) {
        var $link = $(el);
        var href =  $link.attr('href') || $link.data('href');
        var $target = $(href);
        var diff = Math.abs($target.offset().top - scrollTop);

        if ( $target.is(':visible') ) {
          arrActive.push([ $link, diff ]);
        } else {
          arrActive.push([ $link, Infinity ]);
        }
      });

      smallestVal = arrActive.reduce(function(max, arr) {
          return Math.min(max, arr[1]);
      }, Infinity);

      this.prevRoute = this.currentRoute;

      arrActive.forEach(function (val) {
        if (val[1] > smallestVal || val[1] === Infinity) { return; }
        var href = val[0].attr('href') || val[0].data('href');
        this.currentRoute = href.replace('#', '');
      }.bind(this));

      if (this.prevRoute !== this.currentRoute) {
        this.router.navigate('section/' + this.currentRoute, { replace: true });

        this.$jumpToLinks
          .removeClass('active')
          .filter(function (index, el) {
            var $el = $(el);
            var href = $el.attr('href') || $el.data('href');
            return href === '#' + this.currentRoute;
          }.bind(this))
          .addClass('active');
      }
    },

    assignEvents: function () {
      this.$win.on('resize', this.setMinHeight.bind(this));

      if (this.isEnableKeyboardArrows) {
        this.$doc.on('keydown', function (e) {
          if (e.which === 38) { this.pageUp(); }
          if (e.which === 40) { this.pageDown(); }
        }.bind(this));
      }

      if (this.downButtonsSelector) {
        this.$container.on('click touchend', this.downButtonsSelector, function (e) {
          e.preventDefault();
          this.pageDown();
        }.bind(this));
      }

      if (this.upButtonsSelector) {
        this.$container.on('click touchend', this.upButtonsSelector, function (e) {
          e.preventDefault();
          this.pageUp();
        }.bind(this));
      }

      this.$container.on('click touchend', this.paginationTriggerSelector, function (e) {
        e.preventDefault();
        var index = $(e.target).data('ref');

        if (
          this.arrVisitedSections.indexOf(index) === -1 &&
          this.isPaginationAllowOnlyVisited
        ) { return; }

        this.jumpTo(index);
      }.bind(this));

      this.$doc.on('click touchend', this.jumpToSelector, function (e) {
        e.preventDefault();
        var $target = $(e.target);
        var targetSelector = $target.attr('href') || $target.data('href');

        if (!targetSelector) { return; }

        if ( this.validateSections(this.currentSectionIndex) ) {
          this.router.navigate('section/' + targetSelector.replace('#', ''), { trigger: true });
        }
      }.bind(this));

      this.router.on('route:setSection', function (targetSelector) {
        targetSelector = '#' + targetSelector;
        var index = this.selectorToIndex(targetSelector);

        if (index === this.currentSectionIndex) {
          this.scrollTo(targetSelector);
          this.$doc.trigger('full-page-scroll.jump-to-start');
        } if (index >= 0) {
          this.jumpTo(index);
          this.$doc.one( 'full-page-scroll.animation-end', this.scrollTo.bind(this, targetSelector) );
          this.$doc.trigger('full-page-scroll.jump-to-start');
        }
      }.bind(this));
    },

    init: function () {
      this.setMinHeight();
      this.jumpTo(this.currentSectionIndex);
      this.assignEvents();

      Backbone.history.start({
        root: window.location.pathname
      });

      this.detectActiveJumpToLinks();
    }
  };

  window.fullPageSlideshow = function (props) {
    var fullPageSlideshowInstance = new FullPageSlideshow(props);
    fullPageSlideshowInstance.init();
  };

  $.fn.fullPageSlideshow = function (props) {
    props.containerSelector = this;
    var fullPageSlideshowInstance = new FullPageSlideshow(props);
    fullPageSlideshowInstance.init();
  };
}(jQuery));
