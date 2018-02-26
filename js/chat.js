(function ($, moment, _, window) {
  'use strict';

  moment.locale('pt-br');

  var Chat = function (nickname) {
    var ps = new PushStream({
      host: 'localhost',
      port: '8010',
      modes: 'websocket'
    });

    ps.onmessage = _.bind(this.onMessage, this);
    ps.onstatuschange = _.bind(this.onStatusChange, this);
    ps.addChannel('chat');
    ps.connect();

    this.pushstream = ps;
    this.nickname = nickname || 'Guest_' + _.random(1, 9999);
    this.color = '#' + Math.floor(Math.random() * 16777215).toString(16);
    this.sayMyNickRegExp = new RegExp('(^|\\W)'+ this.nickname.escapeRegExp() +'($|\\W)', 'g');

    this._bindEvents();
    this._initTemplates();
  };

  Chat.prototype = {
    constructor: Chat,

    _initTemplates: function () {
      this.joinTemplate = _.template('<p>[<%= time %>] <b><i>O usuário <%= nickname %> entrou na sala.</i></b></p>');
      this.partTemplate = _.template('<p>[<%= time %>] <b><i>O usuário <%= nickname %> saiu da sala.</i></b></p>');
      this.messageTemplate = _.template('<p<% if (sayMyNick) { %> style="background:#F2F2F2;"<% } %>>[<%= time %>] <<span style="color:<%= color %>"><%= nickname %></span>> <%- text %></p>');
    },

    _bindEvents: function () {
      var _this = this;

      $('#message').keyup(function (e) {
        if (e.which == 13) _this.sendMessage();
      });

      $('#btn-send').on('click', _.bind(this.sendMessage, this));

      ['unload', 'beforeunload'].each(function (name) {
        window.addEvent(name, function () {
          _this.pushstream.sendMessage(JSON.stringify({action: 'part', nickname: _this.nickname, color: _this.color}));
        });
      });
    },

    sendMessage: function () {
      var text = $('#message').val();

      if (_.isEmpty(text))
        return;

      this.pushstream.sendMessage(JSON.stringify({text: text, nickname: this.nickname, color: this.color}));
      $('#message').val('');
    },

    onMessage: function (text, id, channel) {
      var textObj = JSON.parse(text), html, context;

      if ('action' in textObj) {
        context = {nickname: textObj.nickname, time: moment().format('LT')};

        if (textObj.action == 'join') {
          html = this.joinTemplate(context);
        } else {
          html = this.partTemplate(context);
        }

        $('#messages').append(html);
        return;
      }

      var sayMyNick = false;

      if (this.sayMyNickRegExp.test(textObj.text) && textObj.nickname != this.nickname)
        sayMyNick = true;

      context = $.extend({}, textObj, {time: moment().format('LT'), sayMyNick: sayMyNick});
      html = this.messageTemplate(context);

      $('#messages')
        .append(html)
        .animate({scrollTop: $('#messages').prop('scrollHeight')}, 1000);
    },

    onStatusChange: function (state) {
      if (state == PushStream.OPEN)
        this.pushstream.sendMessage(JSON.stringify({action: 'join', nickname: this.nickname, color: this.color}));
    }
  };

  $(document).ready(function () {
    this.chat = new Chat(prompt('Qual nickname deseja utilizar?'));
  });

})(jQuery, moment, _, window);
