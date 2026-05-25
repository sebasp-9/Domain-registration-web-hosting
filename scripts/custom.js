
  (function ($) {
  
  "use strict";

    // MENU
    $('#sidebarMenu .nav-link').on('click',function(){
      $("#sidebarMenu").collapse('hide');
    });
    
    // CUSTOM LINK
    $('.smoothscroll').click(function(){
      var el = $(this).attr('href');
      var elWrapped = $(el);
      var header_height = $('.navbar').height();
  
      scrollToDiv(elWrapped,header_height);
      return false;
  
      function scrollToDiv(element,navheight){
        var offset = element.offset();
        var offsetTop = offset.top;
        var totalScroll = offsetTop-navheight;
  
        $('body,html').animate({
        scrollTop: totalScroll
        }, 300);
      }
    });
  
    // CLIENT-SIDE SEARCH: highlight matches and scroll to first
    function clearHighlights(root) {
      $(root).find('span.search-highlight').each(function () {
        var $span = $(this);
        $span.replaceWith(document.createTextNode($span.text()));
      });
    }

    function escapeRegExp(string) {
      return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function highlightInElement(element, query) {
      if (!query) return 0;
      var regex = new RegExp(escapeRegExp(query), 'gi');
      var count = 0;

      $(element).contents().each(function () {
        if (this.nodeType === 3) { // text node
          var text = this.nodeValue;
          if (!text) return;
          if (!regex.test(text)) return;
          regex.lastIndex = 0;

          var fragment = document.createDocumentFragment();
          var lastIndex = 0;
          text.replace(regex, function (match, offset) {
            if (offset > lastIndex) {
              fragment.appendChild(document.createTextNode(text.slice(lastIndex, offset)));
            }
            var highlight = document.createElement('span');
            highlight.className = 'search-highlight';
            highlight.textContent = match;
            fragment.appendChild(highlight);
            lastIndex = offset + match.length;
          });
          if (lastIndex < text.length) {
            fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
          }
          $(this).replaceWith(fragment);
          count++;
        } else if (this.nodeType === 1) { // element node
          var tag = this.nodeName.toLowerCase();
          if (['script','style','noscript','iframe'].indexOf(tag) !== -1) return;
          count += highlightInElement(this, query);
        }
      });
      return count;
    }

    function scrollToFirstHighlight() {
      var $first = $('span.search-highlight').first();
      if ($first.length) {
        var header_height = $('.navbar').outerHeight() || 0;
        var top = $first.offset().top - header_height - 10;
        $('html, body').animate({ scrollTop: top }, 300);
      }
    }

    // Bind header search form
    $(document).on('submit', 'form.header-form', function (e) {
      e.preventDefault();
      var q = $.trim($(this).find('input[name="search"]').val() || '');
      var $scope = $('.main-wrapper');
      clearHighlights($scope);
      if (!q) return;
      highlightInElement($scope.get(0), q);
      scrollToFirstHighlight();
    });

  })(window.jQuery);
