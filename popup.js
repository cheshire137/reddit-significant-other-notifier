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

var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-41000832-1']);
_gaq.push(['_trackPageview']);

(function() {
  var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
  ga.src = 'https://ssl.google-analytics.com/ga.js';
  var s = document.getElementsByTagName('script')[0];
  s.parentNode.insertBefore(ga, s);
})();

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

  get_date_str: function(timestamp) {
    if (!timestamp) {
      return '';
    }
    var date = new Date(timestamp);
    var year = date.getFullYear();
    var day = date.getDate();
    var month = date.getMonth() + 1;
    var hours = date.getHours();
    var minutes = date.getMinutes();
    var am_pm = 'AM';
    if (hours >= 12) {
      hours -= 12;
      am_pm = 'PM';
    }
    if (hours === 0) {
      hours = 12;
    }
    if (minutes < 10) {
      minutes = '0' + minutes;
    }
    return year + '-' + month + '-' + day + ' ' + hours + ':' + minutes + ' ' +
           am_pm;
  },

  on_upvote_fail: function(upvote_link, reason) {
    upvote_link.addClass('failure');
    upvote_link.next('span.upvote-fail-reason').remove();
    var reason_span = $('<span class="upvote-fail-reason hidden"></span>');
    reason_span.text(reason);
    reason_span.insertAfter(upvote_link).fadeIn();
  },

  on_upvote_click: function(tag, upvote_link) {
    var me_url = 'http://www.reddit.com/api/me.json';
    var me = this;
    var dir = upvote_link.hasClass('success') ? 0 : 1; // undo vote or upvote
    $.getJSON(me_url, function(me_data) {
      if (!me_data.data) {
        // User is not logged in to Reddit
        me.on_upvote_fail(upvote_link, 'You are not logged in to Reddit');
        return;
      }
      var modhash = me_data.data.modhash;
      var upvote_url = 'http://www.reddit.com/api/vote';
      $.post(upvote_url, {dir: dir, uh: modhash, id: tag}, function(data) {
        if (dir === 0) {
          upvote_link.removeClass('success');
        } else {
          upvote_link.addClass('success');
        }
      }).fail(function() {
        me.on_upvote_fail(upvote_link, 'Could not upvote');
      });
    });
  },

  style_upvote_link: function(upvote_link, tag) {
    var info_url = 'http://www.reddit.com/api/info/.json?id=' + tag;
    $.getJSON(info_url, function(response) {
      data = response.data;
      if (!data) return;
      var children = data.children;
      if (!children || children.length < 1) return;
      var item = children[0].data;
      if (item.likes) {
        upvote_link.addClass('success');
        upvote_link.attr('title', 'Remove your upvote');
      }
    });
  },

  display_notification: function(notification) {
    var li = $('<li class="hidden" id="' + notification.tag + '"></li>');
    var h3 = $('<h3></h3>');
    var title_link = $('<a href="">' + notification.title + '</a>');
    var open_content_url = function() {
      chrome.tabs.create({url: notification.url});
      return false;
    };
    title_link.click(open_content_url);
    h3.append(title_link);
    li.append(h3);

    var container = $('<div class="content-item"></div>');
    var upvote_link = $('<a href="" class="upvote-link pull-right"></a>');
    upvote_link.attr('title', 'Upvote this ' + notification.content_type);
    this.style_upvote_link(upvote_link, notification.tag);
    var me = this;
    upvote_link.click(function() {
      me.on_upvote_click(notification.tag, upvote_link);
      return false;
    });
    container.append(upvote_link);

    var body_p = $('<p class="body"></p>');
    var body_link = $('<a href="">' + notification.body + '</a>');
    body_link.click(open_content_url);
    body_p.append(body_link);
    container.append(body_p);

    var footer_p = $('<p class="footer"></p>');
    var date = this.get_date_str(notification.timestamp);
    var date_link = $('<a href="">' + date + '</a>');
    date_link.click(open_content_url);
    footer_p.append(date_link);

    var separator = $('<span class="separator">&middot;</span>');
    footer_p.append(separator);

    var thread_link = $('<a href="">thread</a>');
    thread_link.attr('title', 'View all comments');
    thread_link.click(function() {
      chrome.tabs.create({url: notification.thread_url});
      return false;
    });
    footer_p.append(thread_link);

    separator = $('<span class="separator">&middot;</span>');
    footer_p.append(separator);

    var subreddit_link = $('<a href="">' + notification.subreddit + '</a>');
    subreddit_link.attr('title', 'View this subreddit');
    subreddit_link.click(function() {
      chrome.tabs.create({url: notification.subreddit_url});
      return false;
    });
    footer_p.append(subreddit_link);
    container.append(footer_p);
    li.append(container);

    if ($('ul li').length > 0) {
      $('ul').prepend(li);
    } else {
      $('ul').append(li);
    }
    li.fadeIn();
    $('#focus-stealer').focus();
  },

  remove_irrelevant_notifications: function(relevant_notifications) {
    var relevant_tags = [];
    for (var i=0; i<relevant_notifications.length; i++) {
      relevant_tags.push(relevant_notifications[i].tag);
    }
    $('ul li').each(function() {
      var li = $(this);
      var tag = li.attr('id');
      if (relevant_tags.indexOf(tag) === -1) {
        li.fadeOut(function() {
          $(this).remove();
        });
      }
    });
  },

  display_notifications: function() {
    var me = this;
    chrome.storage.sync.get('reddit_so_notifier_notifications', function(nots) {
      nots = nots.reddit_so_notifier_notifications || [];
      me.remove_irrelevant_notifications(nots);
      for (var i=0; i<nots.length; i++) {
        var notification = nots[i];
        if ($('ul li#' + notification.tag).length > 0) {
          continue;
        }
        me.display_notification(notification);
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

chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
  if (request.action == 'content_updated') {
    reddit_so_notifier_popup.display_notifications();
  }
});
