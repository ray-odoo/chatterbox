/** @odoo-module **/

import { ListRenderer } from "@web/views/list/list_renderer";

import { DocumentsRendererMixin } from "../documents_renderer_mixin";
import { DocumentsInspector } from "../inspector/documents_inspector";
import { DocumentsFileUploadViewContainer } from "../helper/documents_file_upload";
import { DocumentsDropZone } from "../helper/documents_drop_zone";
import { CheckBox } from "@web/core/checkbox/checkbox";
import { DocumentsActionHelper } from "../helper/documents_action_helper";
import { DocumentsAttachmentViewer } from "../helper/documents_attachment_viewer";

const { useEffect } = owl;

export class DocumentsListRenderer extends DocumentsRendererMixin(ListRenderer) {
    setup() {
        super.setup();
        useEffect(
            (el) => {
                if (!el) {
                    return;
                }
                const handler = (ev) => {
                    if (ev.key !== "Enter" && ev.key !== " ") {
                        return;
                    }
                    const row = ev.target.closest(".o_data_row");
                    const record = row && this.props.list.records.find((rec) => rec.id === row.dataset.id);
                    if (!record) {
                        return;
                    }
                    const options = {};
                    if (ev.key === " ") {
                        options.isKeepSelection = true;
                    }
                    ev.stopPropagation();
                    ev.preventDefault();
                    record.onRecordClick(ev, options);
                };
                el.addEventListener("keydown", handler);
                return () => {
                    el.removeEventListener("keydown", handler);
                };
            },
            () => [this.root.el]
        );
    }

    get hasSelectors() {
        return this.props.allowSelectors;
    }

    get uploadRecordTemplate() {
        return "documents.DocumentsFileUploadProgressLine";
    }

    /**
     * @override
     */
    getDocumentsInspectorProps() {
        const result = super.getDocumentsInspectorProps();
        // Only show preview in inspector if we are not viewing a file.
        result.withFilePreview = !this.env.documentsPreviewStore.documentList || !this.env.documentsPreviewStore.documentList.exists();;
        return result;
    }
}

// We need the actual event when clicking on a checkbox (to support multi select), only accept onClick
export class DocumentsListRendererCheckBox extends CheckBox {
    /**
     * @override
     */
    onChange(ev) {}

    /**
     * @override
     */
    onClick(ev) {
        if (ev.target.tagName !== "INPUT") {
            return;
        }
        this.props.onChange(ev);
    }
}

DocumentsListRenderer.template = "documents.DocumentsListRenderer";
DocumentsListRenderer.recordRowTemplate = "documents.DocumentsListRenderer.RecordRow";

DocumentsListRenderer.components = Object.assign({}, ListRenderer.components, {
    DocumentsInspector,
    DocumentsListRendererCheckBox,
    DocumentsFileUploadViewContainer,
    DocumentsDropZone,
    DocumentsActionHelper,
    DocumentsAttachmentViewer,
});
