/** @odoo-module alias=planning.PlanningGanttController **/

import GanttController from 'web_gantt.GanttController';
import {_t} from 'web.core';
import {Markup} from 'web.utils';
import Dialog from 'web.Dialog';
import {FormViewDialog} from 'web.view_dialogs';
import { PlanningControllerMixin } from './planning_mixins';

const PlanningGanttController = GanttController.extend(PlanningControllerMixin, {
    events: Object.assign({}, GanttController.prototype.events, {
        'click .o_gantt_button_copy_previous_week': '_onCopyWeekClicked',
        'click .o_gantt_button_send_all': '_onSendAllClicked',
    }),
    buttonTemplateName: 'PlanningGanttView.buttons',

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    _renderButtonQWebParameter: function () {
        return Object.assign({}, this._super(...arguments), {
            activeActions: this.activeActions
        });
    },

    /**
     * @private
     * @returns {Array} Array of objects
     */
    _getRecords() {
        return this.model.get().records;
    },

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * @override
     */
    _onAddClicked: function (ev) {
        ev.preventDefault();
        const { startDate, stopDate } = this.model.get();
        const today = moment().startOf('date'); // for the context we want the beginning of the day and not the actual hour.
        if (this.renderer.state.scale !== 'day' && startDate.isSameOrBefore(today, 'day') && stopDate.isSameOrAfter(today, 'day')) {
            // get the today date if the interval dates contain the today date.
            const context = this._getDialogContext(today);
            for (const k in context) {
                context[`default_${k}`] = context[k];
            }
            this._onCreate(context);
            return;
        }
        this._super(...arguments);
    },

    /**
     * @override
     * @private
     * @param {OdooEvent} event
     */
     _getDialogContext(date, rowId) {
         const context = this._super(...arguments);
         const state = this.model.get();
         if (state.scale == "week" || state.scale == "month") {
             const dateStart = date.clone().set({"hour": 8, "minute": 0});
             const dateStop = date.clone().set({"hour": 17, "minute": 0, "second": 0});
             context[state.dateStartField] = this.model.convertToServerTime(dateStart);
             context[state.dateStopField] = this.model.convertToServerTime(dateStop);
         }
        return context;
    },

    /**
     * Display a dialog form view of employee model for each employee who has no work email
     *
     * This function is only useable in Controller class
     *
     * @param {Object} [result] result containing the employees without work email, context and relation to display the form view of the employee model.
     * @param {Array<number>} [result.res_ids] the employee ids without work email.
     * @param {Object} [result.context] context.
     * @param {string} [result.relation] the model name to display the form view.
     *
     * @returns {Promise}
     */
    _displayDialogWhenEmployeeNoEmail: function (result) {
        if (!result) {
            // then we have nothing to do.
            return Promise.resolve();
        }
        return Promise.all(result.res_ids.map((employee_id) => {
            const def = new Promise((resolve, reject) => {
                const formDialog = new FormViewDialog(this, {
                    title: "",
                    res_model: result.relation,
                    res_id: employee_id,
                    readonly: false,
                    context: result.context,
                    on_saved: () => resolve(),
                }).open();
                formDialog.on('form_dialog_discarded', this, () => reject());
            });
            return def;
        }));
    },

    /**
     * Opens dialog to add/edit/view a record
     * Override required to execute the reload of the gantt view when an action is performed on a
     * single record.
     *
     * @private
     * @param {integer|undefined} resID
     * @param {Object|undefined} context
     */
    _openDialog: function (resID, context) {
        var self = this;
        var record = resID ? _.findWhere(this.model.get().records, {id: resID,}) : {};
        var title = resID ? record.display_name : _t("Add Shift");
        const allContext = Object.assign({}, this.context, context);

        const dialog = new FormViewDialog(this, {
            title: _.str.sprintf(title),
            res_model: this.modelName,
            view_id: this.dialogViews[0][0],
            res_id: resID,
            readonly: !this.is_action_enabled('edit'),
            deletable: this.is_action_enabled('edit') && resID,
            context: allContext,
            on_saved: this.reload.bind(this, {}),
            on_remove: this._onDialogRemove.bind(this, resID),
        });
        dialog.on('closed', this, function(ev){
            // we reload as record can be created or modified (sent, unpublished, ...)
            self.reload();
        });
        dialog.on('execute_action', this, async function(e) {
            const action_name = e.data.action_data.name || e.data.action_data.special;
            const event_data = _.clone(e.data);

            /* YTI TODO: Refactor this stuff to use events instead of empirically reload the page*/
            if (action_name === "action_unschedule") {
                e.stopPropagation();
                self.trigger_up('execute_action', event_data);
                _.delay(function() { self.dialog.destroy(); }, 400);
            } else if (action_name === "unlink") {
                e.stopPropagation();
                const message = _t('Are you sure you want to delete this shift?');

                Dialog.confirm(self, message, {
                    confirm_callback: function(evt) {
                        self.trigger_up('execute_action', event_data);
                        _.delay(function() { self.dialog.destroy() }, 200);
                    },
                    cancel_callback: function(evt) {
                        self.dialog.$footer.find('button').removeAttr('disabled');
                    }
                });
            } else {
                const initialState = dialog.form_view.model.get(dialog.form_view.handle);
                const state = dialog.form_view.renderer.state;
                const resID = e.data.env.currentID;

                if (initialState.data.template_creation != state.data.template_creation && state.data.template_creation) {
                    // Then the shift should be saved as a template too.
                    const message = _t("This shift was successfully saved as a template.")
                    self.displayNotification({
                        type: 'success',
                        message: Markup`<i class="fa fa-fw fa-check"></i><span class="ms-1">${message}</span>`,
                    });
                }

                if (action_name === 'action_send' && resID) {
                    e.stopPropagation();
                    // We want to check if all employees impacted to this action have a email.
                    // For those who do not have any email in work_email field, then a FormViewDialog is displayed for each employee who is not email.
                    try {
                        const result = await this.model.getEmployeesWithoutWorkEmail({
                            model: self.modelName,
                            res_id: resID
                        });
                        await this._displayDialogWhenEmployeeNoEmail(result);
                        self.trigger_up('execute_action', event_data);
                        setTimeout(() => self.dialog.destroy(), 100);
                    } catch (_err) {
                        self.dialog.$footer.find('button').removeAttr('disabled');
                    }
                }
            }
        });

        self.dialog = dialog.open();
        return self.dialog;
    },

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * @private
     * @override
     * @param {MouseEvent} ev
     */
    _onScaleClicked: function (ev) {
        this._super.apply(this, arguments);
        var $button = $(ev.currentTarget);
        var scale = $button.data('value');
        if (scale !== 'week') {
            this.$('.o_gantt_button_copy_previous_week').hide();
        } else {
            this.$('.o_gantt_button_copy_previous_week').show();
        }
    },
});

export default PlanningGanttController;
