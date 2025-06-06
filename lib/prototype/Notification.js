/*
 * @Author: TonyJiangWJ
 * @Date: 2024-11-21 13:13:48
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2025-04-11 13:02:22
 * @Description: AutoJS通知创建工具 powered by deepseek Ai: https://chat.deepseek.com and Codeium
 */
let { config } = require('../../config.js')(runtime, global)
importClass(android.app.Notification)
importClass(android.app.NotificationChannel)
importClass(android.app.NotificationManager)
importClass(android.app.PendingIntent)
importClass(android.content.Context)
importClass(android.content.Intent)
importClass(android.os.Build)

importClass('org.autojs.autojs.timing.TaskReceiver')

function NotificationHelper () {

    const CHANNEL_ID = config.notificationChannelId || "no_click_response_channel"
    const NOTIFICATION_ID = config.notificationId || 47

    /**
     * 创建一个无点击响应的通知
     *
     * @param {*} title 
     * @param {*} message 
     */
    this.createNotification = function (title, message, notificationId, autoCancel, intent) {
        if (typeof autoCancel == 'undefined') {
            autoCancel = false
        }
        let notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE)
        notificationId = getNotificationId(notificationId)
        // 创建通知渠道（适用于 Android 8.0 及以上版本）
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            channel = new NotificationChannel(
                CHANNEL_ID,
                config.notificationChannel || "No Click Response Channel",
                NotificationManager.IMPORTANCE_DEFAULT
            )
            notificationManager.createNotificationChannel(channel)
        }

        // 创建一个空的 PendingIntent，表示无点击响应
        let pendingIntent = PendingIntent.getBroadcast(context, 0, intent || new Intent(), PendingIntent.FLAG_IMMUTABLE)

        // 构建通知
        let builder
        let Builder = android.app.Notification.Builder
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            builder = new Builder(context, CHANNEL_ID)
        } else {
            builder = new Builder(context)
        }
        // 通过字符串获取资源 ID
        let res = context.getResources()
        let drawableName = "autojs_material" // 去掉 "@drawable/" 前缀的图标地址
        let drawableId = res.getIdentifier(drawableName, "drawable", context.getPackageName())

        let notification = builder
            .setContentTitle(title)
            .setContentText(message)
            .setSmallIcon(drawableId)
            .setContentIntent(pendingIntent) // 设置空的 PendingIntent
            .setAutoCancel(autoCancel) // true表示点击后自动取消通知
            .build()

        // 发送通知
        notificationManager.notify(notificationId, notification)
    }

    /**
     * 创建一个有点击响应的通知，点击后启动当前脚本 依赖于AutoJS自身的org.autojs.autojs.timing.TaskReceiver
     * 主要用于白名单、佛系模式等延迟启动后的通知，可以通过点击通知直接执行脚本。
     *
     * @param {string} title - 通知标题
     * @param {string} message - 通知内容，将自动带上当前脚本路径
     * @param {number} [notificationId] - 通知id，默认取值 NOTIFICATION_ID * 10 + 1 和业务通知区分开
     */
    this.createNotificationWithStart = function (title, message, notificationId) {
        // 和脚本业务通知区分开
        notificationId = getNotificationId(notificationId, 100)
        let intent = new Intent(context, TaskReceiver)
        intent.setAction(new Date().getTime() + '')
        let scriptPath = engines.myEngine().getSource() + ''
        intent.putExtra('path', scriptPath)
        intent.putExtra('triggerByNotice', new Date().getTime() + '')
        console.log('noticeId: ' + notificationId + ' intent path:' + intent.getStringExtra('path'))
        this.createNotification(title,
            message + '脚本：' + scriptPath.replace('/storage/emulated/0', '').replace('/sdcard', ''),
            notificationId, true, intent)
    }

    /**
     * 取消通知，执行脚本时主动撤销延迟启动的通知
     * @param {number} notificationId 
     */
    this.cancelNotice = function (notificationId, offset) {
        let notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE)
        let noticeId = getNotificationId(notificationId, offset)
        console.log('取消通知 noticeId: ', noticeId)
        notificationManager.cancel(noticeId);
    }

    function getNotificationId (notificationId, offset) {
        offset = offset || 10
        if (typeof notificationId == 'string') {
            return positiveMax31Bit(NOTIFICATION_ID * offset | simpleHash(notificationId))
        }
        notificationId = notificationId || positiveMax31Bit(NOTIFICATION_ID * offset | simpleHash(engines.myEngine().source))
        return notificationId
    }

    /**
     * 确保传入的值被当作一个正的 31 位整数来处理。
     *
     * @param {number} value - 需要转换为正的 31 位整数的输入数字。
     * @returns {number} - 转换后得到的正的 31 位整数值。如果值为0，则返回1
     */
    function positiveMax31Bit (value) {
        // 转换为无符号32位整数
        value >>>= 0
        // 如果溢出，右移一位
        if ((value | 0x7fffffff) < 0) {
            value >>>= 1
        }
        return value == 0 ? 1 : value
    }

    function simpleHash (str) {
        str += '' // 转换为string
        if (typeof str == 'undefined' || str == null || str == '') {
            return 0
        }
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = (hash << 5) - hash + str.charCodeAt(i);
            hash |= 0; // 转换为 32 位整数
        }
        return hash >>> 0; // 使其为非负整数
    }
}

module.exports = new NotificationHelper()