/** @odoo-module **/

import { browser } from "@web/core/browser/browser";
import field_utils from "web.field_utils";
import CalendarController from 'calendar.CalendarController';

const legacy = {
    field_utils,
};

CalendarController.include({
    custom_events: Object.assign({}, CalendarController.prototype.custom_events, {
        'appointment_get_copied_url': '_onCopyLastAppointmentURL',
        'appointment_link_clipboard': '_onClickAppointmentLink',
        'create_custom_appointment': '_onCreateCustomAppointment',
        'slots_discard': '_onDiscardSlots',
        'set_slots_creation_mode': '_setModeToSlotsCreation',
        'search_create_anytime_appointment_type': '_onSearchCreateAnytimeAppointment',
    }),
    /**
     * Save in the clipboard in the URL of the appointment type selected
     * @param {Event} ev 
     */
    async _onClickAppointmentLink(ev) {
        const $currentTarget = $(ev.data.currentTarget);
        const appointment = await this._rpc({
            route: '/appointment/appointment_type/get_book_url',
            params: {
                appointment_type_id: $currentTarget.attr('id'),
            },
        });
        browser.navigator.clipboard.writeText(appointment.invite_url);
        this.lastAppointmentURL = appointment.invite_url;
    },
    /**
     * Copy in the clipboard the last appointment URL
     * @param {Event} ev 
     */
     _onCopyLastAppointmentURL(ev) {
        browser.navigator.clipboard.writeText(this.lastAppointmentURL);
    },
    /**
     * Create a custom appointment type and fill the slots with the ones
     * created on the calendar view.
     * The URL of the new appointment type is then saved in the clipboard.
     * @param {Event} ev 
     */
    async _onCreateCustomAppointment(ev) {
        const events = this.renderer.calendar.getEvents();
        const slotEvents = events.filter(event => event.extendedProps.slot);
        const slots = slotEvents.map(slot => {
            return {
                start: legacy.field_utils.parse.datetime(slot.start).toJSON(),
                end: (
                    slot.end ? legacy.field_utils.parse.datetime(slot.end) : legacy.field_utils.parse.datetime(moment(slot.start).add(1, 'days'))
                ).toJSON(),
                allday: slot.allDay,
            };
        });
        if (slots.length) {
            slotEvents.forEach(event => event.remove());
            const customAppointment = await this._rpc({
                route: '/appointment/appointment_type/create_custom',
                params: {
                    slots: slots,
                    context: this.context, // To pass default values like opportunity_id for appointment_crm
                },
            });
            if (customAppointment.appointment_type_id) {
                browser.navigator.clipboard.writeText(customAppointment.invite_url);
                this.lastAppointmentURL = customAppointment.invite_url;
            }
        }
        this.model.setCalendarMode('default');
    },
    /**
     * Discard the slots created in the calendar view and reset the calendar to the
     * default mode.
     * @param {Event} ev 
     */
     _onDiscardSlots(ev) {
        const events = this.renderer.calendar.getEvents();
        const slotEvents = events.filter(event => event.extendedProps.slot);
        slotEvents.forEach(event => event.remove());
        this.model.setCalendarMode('default');
    },
    /**
     * Search/create the anytime appointment type of the user when
     * they click on the button "Anytime".
     * @param {Event} ev
     */
     async _onSearchCreateAnytimeAppointment(ev) {
        const anytimeAppointment = await this._rpc({
            route: '/appointment/appointment_type/search_create_anytime',
        });
        if (anytimeAppointment.appointment_type_id) {
            browser.navigator.clipboard.writeText(anytimeAppointment.invite_url);
            this.lastAppointmentURL = anytimeAppointment.invite_url;
        }
    },
    /**
     * Update the mode of the calendar to slots-creation
     * (mode to select slots in the calendar view for a custom appointment type)
     * @param {Event} ev
     */
    _setModeToSlotsCreation(ev) {
        this.model.setCalendarMode('slots-creation');
    },
});
