/** @odoo-module **/

import { one } from '@mail/model/model_field';
import { clear } from '@mail/model/model_field_command';
import { addFields, addRecordMethods } from '@mail/model/model_core';
import '@mail/models/channel_preview_view'; // ensure the model definition is loaded before the patch

addFields('ChannelPreviewView', {
    /**
     * Determines whether this thread preview view should have the swiper
     * feature, and if so contains the component managing this feature.
     */
    swiperView: one('SwiperView', {
        compute: '_computeSwiperView',
        inverse: 'channelPreviewViewOwner',
    }),
});

addRecordMethods('ChannelPreviewView', {
    /**
     * @private
     * @returns {Object|FieldCommand}
     */
    _computeSwiperView() {
        return (
            this.messaging.device.isSmall &&
            (
                (this.thread.isChatChannel && this.thread.isPinned) ||
                (this.channel.localMessageUnreadCounter > 0)
            )
        ) ? {} : clear();
    },
});
