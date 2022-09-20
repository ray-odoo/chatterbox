/** @odoo-module **/

import { ComponentAdapter } from 'web.OwlCompatibility';
import FieldHtml from 'web_editor.field.html';
import { useService, useAutofocus } from "@web/core/utils/hooks";
import { session } from '@web/session';
import Dialog from 'web.Dialog';
import { _t } from 'web.core';

const { Component, onMounted, onPatched, onWillUnmount, useState, useEffect, useExternalListener } = owl;

class PayrollDashboardTodoAdapter extends ComponentAdapter {
    setup() {
        // Legacy environment is required for the web editor
        this.env = owl.Component.env;
        super.setup();
        onMounted(() => this.props.setWidget(this.widget));
    }

    /**
     * @override
     */
    renderWidget() {
        // Explicitely remove everything before render as it is not always done.
        this.widget.$el.empty();
        if (this.widget._qwebPlugin) {
            this.widget._qwebPlugin.destroy();
        }
        this.widget._render();
    }

    /**
     * @override
     * @param {object} nextProps
     */
    updateWidget(nextProps) {
        const record = nextProps.widgetArgs[1];
        this.widget._reset(record);
    }
}

export class PayrollDashboardTodo extends Component {
    setup() {
        this.actionService = useService("action");
        this.orm = useService("orm");
        this.FieldHtml = FieldHtml;
        this.state = useState({
            activeNoteId: this.props.notes.length ? this.props.notes[0]['id'] : -1,
            mode: this.props.notes.length ? 'readonly' : '',
            isActiveNoteEditable: false
        });
        this.recentlyCreatedNote = false;
        this.autofocusInput = useAutofocus();
        onWillUnmount(() => {
            if (this.state.mode === 'edit') {
                this.saveNote()
            }
        });
        onPatched(() => {
            if (this.state.mode === '' && this.props.notes.length > 0) {
                this.state.mode = 'readonly';
                this.state.activeNoteId = this.props.notes[0]['id'];
            }

            if (this.recentlyCreatedNote) {
                this.state.mode = 'readonly';
                this.state.isActiveNoteEditable = false;
                this.state.activeNoteId = this.recentlyCreatedNote;
                //this.onClickNoteTab(this.recentlyCreatedNote);
                this.onDoubleClickNoteTab(this.recentlyCreatedNote);
                this.recentlyCreatedNote = false;
            }
        });

        useExternalListener(window, 'beforeunload', (e) => {
            if (this.state.mode === 'edit') {
                this.saveNote();
            }
        });

        useEffect((el) => {
            if (el) {
                if (["INPUT", "TEXTAREA"].includes(el.tagName)) {
                    el.selectionStart = 0;
                    el.selectionEnd = el.value.length;
                }
            }
        }, () => [this.autofocusInput.el])
    }

    /**
     * @returns {Object} Returns the current note data
     */
    get activeNoteData() {
        return this.props.notes.find((note) => note.id === this.state.activeNoteId);
    }

    /**
     * @returns {number} ID of the tag used to fetch the notes on the dashboard
     */
    get payrollTagId() {
        return this.props.tagId;
    }

    /**
     * @returns { Number } id of the session user
     */
    get userId() {
        return session.user_id[0];
    }

    /**
     * @returns {Array} The widgetargs to start the html field with
     */
    get noteWidgetArgs() {
        return [
            'memo',
            this.generateRecord(),
            {
                mode: this.state.mode,
                attrs: {
                    options: {
                        collaborative: true,
                        height: 600,
                    },
                },
            },
        ]
    }

    /**
     * Creates a note.
     *
     */
    async createNoteForm() {
        const createdNote = await this.orm.create('note.note', [{
            'name': 'Untitled',
            'tag_ids': [[4, this.payrollTagId]],
            'company_id': owl.Component.env.session.user_context.allowed_company_ids[0],
        }]);
        this.recentlyCreatedNote = createdNote;
        await this.props.reloadNotes();
    }

    /**
     * Switches to the requested note.
     *
     * @param { Number } noteId ID of the tab's note record
     */
    onClickNoteTab(noteId) {
        if (noteId == this.state.activeNoteId) {
            return;
        }
        if (this.state.mode === 'edit') {
            this.saveNote();
        }
        this.state.mode = 'readonly';
        this.state.isActiveNoteEditable = false;
        this.state.activeNoteId = noteId;
    }

    /**
     * On double-click, the note name should become editable
     * @param { Number } noteId 
     */
    onDoubleClickNoteTab(noteId) {
        if (noteId == this.state.activeNoteId) {
            this.state.isActiveNoteEditable = true;
            this.bufferedText = this.activeNoteData.name;
        }
    }

    /**
     * On input, update buffer
     * @param { Event } ev 
     */
    onInputNoteNameInput(ev) {
        this.bufferedText = ev.target.value;
    }

    /**
     * If enter/escape is pressed either save changes or discard them
     * @param { Event } ev 
     */
    onKeyDownNoteNameInput(ev) {
        switch (ev.key) {
            case 'Enter':
                this._applyNoteRename();
                break;
            case 'Escape':
                this.state.isActiveNoteEditable = false;
                break;
        }
    }

    /**
     * Renames the active note with the text saved in the buffer
     */
    async _applyNoteRename() {
        if (this.bufferedText !== this.activeNoteData.name) {
            this.activeNoteData.name = this.bufferedText;
            await this.orm.write('note.note', [this.state.activeNoteId], {
                'name': this.activeNoteData.name
            });
        }
        this.state.isActiveNoteEditable = false;
    }

    /**
     * Handler when delete button is clicked
     */
    async onNoteDelete() {
        const message = _t('Are you sure you want to delete this note?');
        Dialog.confirm(this, message, {
            confirm_callback: (e) => {
                this._deleteNote(this.state.activeNoteId);
            },
        });
    }

    /**
     * Deletes the specified note
     * @param {*} noteId 
     */
    async _deleteNote(noteId) {
        await this.orm.unlink("note.note", [
            noteId,
        ]);
        await this.props.reloadNotes();
    }

    /**
     * When the input loses focus, save the changes
     * @param {*} ev 
     */
    handleBlur(ev) {
        this._applyNoteRename();
    }

    /**
     * Handles the click on the create note button
     */
    async onClickCreateNote() {
        if (this.state.mode === 'edit') {
            await this.saveNote(false);
        }
        this.createNoteForm();
    }

    /**
     * Switches the component to edit mode, creating an editor instead of simply displaying the note.
     */
    onClickEdit() {
        if (this.state.isActiveNoteEditable || this.state.mode === 'edit' || this.state.activeNoteId < 0) {
            return;
        }
        this.state.mode = 'edit';
    }

    /**
     * Triggers an update on the parent component to save the local changes to the database.
     * Re-renders if requested.
     *
     * @param {boolean} updateState whether to revert the state back to readonly or not.
     */
    async saveNote(updateState=false) {
        this.fieldHtmlWidget.commitChanges();
        const newValue = this.fieldHtmlWidget._getValue();
        await this.props.updateNoteMemo(this.state.activeNoteId, newValue);
        if (updateState) {
            this.state.mode = 'readonly';
        }
    }

    /**
     * Creates a fake record to start our html editor with.
     * Uses the current active note id.
     */
    generateRecord() {
        // if active note was deleted, set the first note as the active one
        if (!this.activeNoteData) {
            this.state.activeNoteId = this.props.notes[0] && this.props.notes[0].id;
        }
        const activeNote = this.activeNoteData;
        return {
            id: activeNote.id,
            res_id: activeNote.id,
            model: 'note.note',
            data: {
                memo: activeNote.memo,
            },
            fields: {
                memo: {string: '', type: 'html'},
            },
            fieldsInfo: {
                default: {},
            },
            getContext() {
                return session.user_context;
            },
        }
    }

    /**
     * Hack: this component needs to retrieve the instance of the legacy field html
     * widget. Remove this logic when the fields are converted to owl.
     * @param {Widget} widget
     */
    setFieldHtmlWidget(widget) {
        this.fieldHtmlWidget = widget;
    }
}

PayrollDashboardTodo.template = 'hr_payroll.TodoList';
PayrollDashboardTodo.components = {
    PayrollDashboardTodoAdapter,
};
