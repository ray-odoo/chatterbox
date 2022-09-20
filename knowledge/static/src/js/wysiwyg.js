/** @odoo-module **/

import { qweb as QWeb, _t } from 'web.core';
import Wysiwyg from 'web_editor.wysiwyg';
import { KnowledgeArticleLinkModal } from './wysiwyg/knowledge_article_link.js';
import { preserveCursor, setCursorStart } from '@web_editor/js/editor/odoo-editor/src/OdooEditor';

Wysiwyg.include({
    /**
     * @override
     */
    init: function (parent, options) {
        if (options.knowledge_commands) {
            /**
             * knowledge_commands is a view option from a field_html that
             * indicates that knowledge-specific commands should be loaded.
             * powerboxFilters is an array of functions used to filter commands
             * displayed in the powerbox.
             */
            options.powerboxFilters = options.powerboxFilters ? options.powerboxFilters : [];
            options.powerboxFilters.push(this._filterKnowledgeCommandGroupInTemplate);
        }
        this._super.apply(this, arguments);
    },
    /**
     * Prevent usage of commands from the group "Knowledge" inside the block
     * inserted by the /template Knowledge command. The content of a /template
     * block is destined to be used in @see OdooEditor in modules other than
     * Knowledge, where knowledge-specific commands may not be available.
     * i.e.: prevent usage /template in a /template block
     *
     * @param {Array} commands commands available in this wysiwyg
     * @returns {Array} commands which can be used after the filter was applied
     */
    _filterKnowledgeCommandGroupInTemplate: function (commands) {
        let anchor = document.getSelection().anchorNode;
        if (anchor.nodeType !== Node.ELEMENT_NODE) {
            anchor = anchor.parentElement;
        }
        if (anchor && anchor.closest('.o_knowledge_template')) {
            commands = commands.filter(command => command.category !== 'Knowledge');
        }
        return commands;
    },
    /**
     * @override
     * @returns {Array[Object]}
     */
    _getPowerboxOptions: function () {
        const options = this._super();
        const {commands, categories} = options;
        categories.push({ name: 'Media', priority: 50 });
        commands.push({
            category: 'Media',
            name: 'Article',
            priority: 10,
            description: 'Link an article.',
            fontawesome: 'fa-file',
            callback: () => {
                this._insertArticleLink();
            },
        });
        if (this.options.knowledge_commands) {
            categories.push({ name: 'Knowledge', priority: 10 });
            commands.push({
                category: 'Knowledge',
                name: 'File',
                priority: 20,
                description: 'Embed a file.',
                fontawesome: 'fa-file',
                callback: () => {
                    this.openMediaDialog({
                        noVideos: true,
                        noImages: true,
                        noIcons: true,
                        noDocuments: true,
                        knowledgeDocuments: true,
                    });
                }
            }, {
                category: 'Knowledge',
                name: "Template",
                priority: 10,
                description: "Add a template section.",
                fontawesome: 'fa-pencil-square',
                callback: () => {
                    this._insertTemplate();
                },
            }, {
                category: 'Knowledge',
                name: _t('Table Of Content'),
                priority: 30,
                description: _t('Add a table of content.'),
                fontawesome: 'fa-bookmark',
                callback: () => {
                    this._insertTableOfContent();
                }
            }, {
                category: 'Knowledge',
                name: _t('Index'),
                priority: 40,
                description: _t('Show the first level of nested articles.'),
                fontawesome: 'fa-list',
                callback: () => {
                    this._insertArticlesStructure(true);
                }
            }, {
                category: 'Knowledge',
                name: _t('Outline'),
                priority: 40,
                description: _t('Show all nested articles.'),
                fontawesome: 'fa-list',
                callback: () => {
                    this._insertArticlesStructure(false);
                }
            });
        }
        return {...options, commands, categories};
    },
    /**
     * Notify @see FieldHtmlInjector that toolbars need to be injected
     * @see KnowledgeToolbar
     *
     * @param {Element} container
     */
    _notifyNewToolbars(container) {
        const toolbarsData = [];
        container.querySelectorAll('.o_knowledge_toolbar_anchor').forEach(function (container, anchor) {
            const type = Array.from(anchor.classList).find(className => className.startsWith('o_knowledge_toolbar_type_'));
            if (type) {
                toolbarsData.push({
                    container: container,
                    anchor: anchor,
                    type: type,
                });
            }
        }.bind(this, container));
        this.$editable.trigger('refresh_toolbars', { toolbarsData: toolbarsData });
    },
    /**
     * Notify @see FieldHtmlInjector that behaviors need to be injected
     * @see KnowledgeBehavior
     *
     * @param {Element} anchor
     */
    _notifyNewBehaviors(anchor) {
        const behaviorsData = [];
        const type = Array.from(anchor.classList).find(className => className.startsWith('o_knowledge_behavior_type_'));
        if (type) {
            behaviorsData.push({
                anchor: anchor,
                type: type,
            });
        }
        this.$editable.trigger('refresh_behaviors', { behaviorsData: behaviorsData});
    },
    /**
     * Insert a /toc block (table of content)
     */
    _insertTableOfContent: function () {
        const tableOfContentBlock = $(QWeb.render('knowledge.knowledge_table_of_content_wrapper', {}))[0];
        const [container] = this.odooEditor.execCommand('insert', tableOfContentBlock);
        this._notifyNewBehaviors(container);
    },
    /**
     * Insert a /structure block.
     * It will list all the articles that are direct children of this one.
     */
     _insertArticlesStructure: function (childrenOnly) {
        const articlesStructureBlock = $(QWeb.render('knowledge.articles_structure_wrapper', {
            childrenOnly: childrenOnly
        }))[0];
        const [container] = this.odooEditor.execCommand('insert', articlesStructureBlock);
        this._notifyNewToolbars(container);
        this._notifyNewBehaviors(container);
    },
    /**
     * Insert a /template block
     */
    _insertTemplate() {
        const templateBlock = $(QWeb.render('knowledge.template_block', {}))[0];
        const [container] = this.odooEditor.execCommand('insert', templateBlock);
        setCursorStart(container.querySelector('.o_knowledge_content > p'));
        this._notifyNewToolbars(container);
        this._notifyNewBehaviors(container);
    },
    /**
     * Insert a /article block (through a dialog)
     */
    _insertArticleLink: function () {
        const restoreSelection = preserveCursor(this.odooEditor.document);
        const dialog = new KnowledgeArticleLinkModal(this, {});
        dialog.on('save', this, article => {
            if (article) {
                const articleLinkBlock = $(QWeb.render('knowledge.wysiwyg_article_link', {
                    display_name: article.display_name,
                    href: '/knowledge/article/' + article.id,
                    article_id: article.id,
                }))[0];
                dialog.close();
                restoreSelection();
                const [anchor] = this.odooEditor.execCommand('insert', articleLinkBlock);
                this._notifyNewBehaviors(anchor);
            }
        });
        dialog.on('closed', this, () => {
            restoreSelection();
        });
        dialog.open();
    },
    /**
     * Notify the @see FieldHtmlInjector when a /file block is inserted from a
     * @see MediaDialog
     *
     * @private
     * @override
     */
    _onMediaDialogSave(params, element) {
        const result = this._super(...arguments);
        if (!result) {
            return;
        }
        const [container] = result;
        if (container.classList.contains('o_knowledge_file')) {
            setCursorStart(container.nextElementSibling);
            this._notifyNewToolbars(container);
            this._notifyNewBehaviors(container);
        }
        return result;
    },
});
