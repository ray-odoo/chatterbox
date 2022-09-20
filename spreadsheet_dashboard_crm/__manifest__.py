# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.
{
    'name': "Spreadsheet dashboard for CRM",
    'version': '1.0',
    'category': 'Hidden',
    'summary': 'Spreadsheet',
    'description': 'Spreadsheet',
    'depends': ['spreadsheet_dashboard', 'crm_enterprise'],
    'data': [
        "data/dashboards.xml",
    ],
    'demo': [],
    'installable': True,
    'auto_install': ['crm_enterprise'],
    'license': 'OEEL-1',
    'assets': {
        'spreadsheet_dashboard.o_spreadsheet': [],
        'web.assets_backend': [],
        'web.assets_tests': [
            'spreadsheet_dashboard_crm/static/tests/**/*',
        ],
        'web.qunit_suite_tests': []
    }
}
