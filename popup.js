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
  setup_options_link: function() {
    $('a[href="#options"]').click(function() {
      chrome.tabs.create({url: chrome.extension.getURL("options.html")});
      return false;
    });
  },

  setup_clear_notifications_link: function() {
    $('a[href="#clear-notifications"]').click(function() {
      chrome.storage.sync.set(
        {'reddit_so_notifier_notifications': []},
        function() {
          $('ul li').fadeOut(function() {
            $(this).remove();
          });
        }
      );
      return false;
    });
  },

  display_notification: function(notification) {
    var li = $('<li></li>');
    var h3 = $('<h3></h3>');
    var title_link = $('<a href="">' + notification.title + '</a>');
    var on_link_click = function() {
      chrome.tabs.create({url: notification.url});
      return false;
    };
    title_link.click(on_link_click);
    h3.append(title_link);
    li.append(h3);
    var p = $('<p></p>');
    var body_link = $('<a href="">' + notification.body + '</a>');
    body_link.click(on_link_click);
    p.append(body_link);
    li.append(p);
    $('ul').append(li);
    $('#focus-stealer').focus();
  },

  display_notifications: function() {
    var me = this;
    chrome.storage.sync.get('reddit_so_notifier_notifications', function(nots) {
      nots = nots.reddit_so_notifier_notifications || [];
      for (var i=0; i<nots.length; i++) {
        me.display_notification(nots[i]);
      }
    });
  },

  on_popup_opened: function() {
    this.setup_options_link();
    this.setup_clear_notifications_link();
    this.display_notifications();
  }
};

$(function() {
  reddit_so_notifier_popup.on_popup_opened();
  chrome.extension.sendRequest({action: 'check_for_content'});
});
