import { autobind } from 'core-decorators';
import getModels from './models';

export default (ctx) => {
  return class NotificationModule {

    async init() {
      this.models = getModels(ctx);
      this.config = ctx.config.rating;
    }
    async run() {
      this.ws = ctx.app.ws('/api/module/notification')
        .on('connection', this.onSocket);
      ctx.app.use('/api/module/notification', this.getApi());
    }

    async notify(params) {
      const { Notification } = this.models;
      const notification = new Notification(params);
      await notification.save();
      if (params.userId) {
        const room = this.getRoomName(params.userId);
        this.emit({ room, data: notification });
      }
    }

    getRoomName(userId) {
      return `user_${userId}`;
    }

    emit(room, data, action = 'notification') {
      return this.ws.to(room).emit(action, data);
    }

    @autobind
    onSocket(socket) {
      const { req } = socket;
      if (!req.user || !req.user._id) throw new Error('Not Auth');
      const roomName = this.getRoomName(req.user._id);
      socket.join(roomName);
    }

    getApi() {
      const api = ctx.asyncRouter();
      const { isAuth } = ctx.middlewares;
      const { Notification } = this.models;
      // Поиск
      api.get('/', isAuth, async (req) => {
        const userId = req.user._id;
        const params = req.allParams();
        let notifications = await Notification.find({
          userId,
          ...params,
        });
        notifications = await Promise.all(notifications.map((notification) => {
          return new Promise(async (resolve) => {
            try {
              await Notification.populate(notification, 'user');
            } catch (err) {}
            try {
              await Notification.populate(notification, 'object');
            } catch (err) {}
            try {
              await Notification.populate(notification, 'subject');
            } catch (err) {}
            return resolve(notification);
          });
        }));
        return notifications;
      });
      api.post('/', isAuth, async (req) => {
        const params = req.allParams();
        const notification = new Notification(params);
        return notification.save();
      });
      api.post('/view/:id', isAuth, async (req) => {
        // const userId = req.user._id;
        const notification = await Notification
        .findById(req.params.id)
        .then(ctx.helpers.checkNotFound);
        if (notification.viewedAt) return notification;
        notification.viewedAt = new Date();
        return notification.save();
      });
      api.put('/:id', isAuth, async (req) => {
        const params = req.allParams();
        const comment = await Notification
        .findById(params.id)
        .then(ctx.helpers.checkNotFound);
        Object.assign(comment, params);
        return comment.save();
      });
      api.delete('/:id', isAuth, async (req) => {
        const params = req.allParams();
        const notification = await Notification
        .findById(params.id)
        .then(ctx.helpers.checkNotFound);
        return notification.remove();
      });
      return api;
    }
  };
};