/*
 * Copyright 2013 Sarah Vessels
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

// var _gaq = _gaq || [];
// _gaq.push(['_setAccount', 'UA-40563451-1']);
// _gaq.push(['_trackPageview']);

// (function() {
//   var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
//   ga.src = 'https://ssl.google-analytics.com/ga.js';
//   var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
// })();

var reddit_so_notifier_popup = {
  setup_user_link: function() {
    chrome.storage.sync.get('reddit_so_notifier_options', function(opts) {
      opts = opts.reddit_so_notifier_options || {};
      if (opts.user_name) {
        var url = 'http://www.reddit.com/user/' + opts.user_name;
        $('h2 a').click(function() {
          chrome.tabs.create({url: url});
          return false;
        });
        $('h2 a span').text(opts.user_name);
      } else {
        $('h2 a').hide();
      }
    });
  },

  setup_options_link: function() {
    $('a#options-link').blur().click(function() {
      chrome.tabs.create({url: chrome.extension.getURL("options.html")});
      return false;
    });
  },

  on_popup_opened: function() {
    this.setup_options_link();
    this.setup_user_link();
  }
};

$(function() {
  reddit_so_notifier_popup.on_popup_opened();
});
