/** @odoo-module **/

import "@crm/models/ir_model"; // ensure the community override is loaded before the patch

import { patchRecordMethods } from "@mail/model/model_core";
import "@mail/models/ir_model"; // ensure the model definition is loaded before the patch


patchRecordMethods("ir.model", {
    /**
     * @override
     */
    _computeAvailableWebViews() {
        if (this.model === "crm.lead") {
            return [
                'list',
                'kanban',
                'form',
                'calendar',
                'pivot',
                'graph',
                'cohort',
                'dashboard',
                'map',
                'activity',
            ];
        }
        return this._super();
    },
});
