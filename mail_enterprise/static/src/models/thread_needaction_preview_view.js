/** @odoo-module **/

import { one } from '@mail/model/model_field';
import { clear } from '@mail/model/model_field_command';
import { addFields, addRecordMethods } from '@mail/model/model_core';
import '@mail/models/thread_needaction_preview_view'; // ensure the model definition is loaded before the patch

addFields('ThreadNeedactionPreviewView', {
    /**
     * Determines whether this thread needaction preview view should have the
     * swiper feature, and if so contains the component managing this feature.
     */
    swiperView: one('SwiperView', {
        compute: '_computeSwiperView',
        inverse: 'threadNeedactionPreviewViewOwner',
    }),
});

addRecordMethods('ThreadNeedactionPreviewView', {
    /**
     * @private
     * @returns {FieldCommand}
     */
    _computeSwiperView() {
        return this.messaging.device.isSmall ? {} : clear();
    },
});
