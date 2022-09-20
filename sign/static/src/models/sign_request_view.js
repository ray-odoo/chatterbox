/** @odoo-module **/

import { registerModel } from '@mail/model/model_core';
import { attr, one } from '@mail/model/model_field';

registerModel({
    name: 'SignRequestView',
    recordMethods: {
        async onClickRequestSign() {
            this.env.services.action.doAction(
                {
                    name: this.env._t("Signature Request"),
                    type: 'ir.actions.act_window',
                    view_mode: 'form',
                    views: [[false, 'form']],
                    target: 'new',
                    res_model: 'sign.send.request',
                },
                {
                    additional_context: {
                        'sign_directly_without_mail': false,
                        'default_activity_id': this.activityViewOwner.activity.id,
                    },
                    onClose: () => {
                        this.activityViewOwner.activity.update();
                        this.component.trigger('reload');
                    },
                },
            );
        },
    },
    fields: {
        activityViewOwner: one('ActivityView', {
            identifying: true,
            inverse: 'signRequestView',
        }),
        component: attr(),
    },
});
