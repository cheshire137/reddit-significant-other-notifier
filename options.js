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

function clear_last_check_timestamp(callback) {
  chrome.storage.local.get('reddit_so_notifier', function(data) {
    data = data.reddit_so_notifier || {};
    data.last_check_timestamp = null;
    chrome.storage.local.set({'reddit_so_notifier': data}, function() {
      callback();
    });
  });
}

function save_options() {
  var user_name = $.trim($('#user_name').val());
  $('#user_name').val(user_name);
  var notifications = $('input[name="notifications"]:checked').val();
  var options = {user_name: user_name, notifications: notifications};
  var status_area = $('#status-message');
  chrome.storage.sync.set({'reddit_so_notifier_options': options}, function() {
    clear_last_check_timestamp(function() {
      status_area.text('Okay, got it!').fadeIn(function() {
        setTimeout(function() {
          status_area.fadeOut();
        }, 2000);
        var bg_page = chrome.extension.getBackgroundPage();
        bg_page.reddit_so_notifier.setup_content_checkers();
      });
    });
  });
}

function restore_options() {
  chrome.storage.sync.get('reddit_so_notifier_options', function(opts) {
    opts = opts.reddit_so_notifier_options || {};
    if (opts.user_name) {
      $('#user_name').val(opts.user_name);
    } else {
      $('#user_name').val('');
    }
    if (opts.notifications) {
      var selector = 'input[name="notifications"]' +
                     '[value="' + opts.notifications + '"]';
      $(selector).attr('checked', 'checked');
    } else {
      $('#posts_and_comments').attr('checked', 'checked');
    }
  });
}

document.addEventListener('DOMContentLoaded', restore_options);
$('a[href="#save-options"]').click(save_options);
