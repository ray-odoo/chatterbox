# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import api, fields, models, _
from odoo.tools import ormcache
from odoo.exceptions import ValidationError


class ResCompany(models.Model):
    _inherit = 'res.company'

    onss_company_id = fields.Char(string="ONSS Company ID", help="10-digit code given by ONSS")
    onss_registration_number = fields.Char(string="ONSS Registration Number", help="9-digit code given by ONSS")
    dmfa_employer_class = fields.Char(string="DMFA Employer Class", help="3-digit code given by ONSS")
    dmfa_location_unit_ids = fields.One2many('l10n_be.dmfa.location.unit', 'company_id', string="Work address DMFA codes")
    l10n_be_company_number = fields.Char('Company Number')
    l10n_be_revenue_code = fields.Char('Revenue Code')
    l10n_be_ffe_employer_type = fields.Selection([
        ('commercial', 'Employers with industrial or commercial purposes'),
        ('non_commercial', 'Employers without industrial or commercial purposes'),
    ], default='commercial')
    sdworx_code = fields.Char("SDWorx code", groups="hr.group_hr_user")
    onss_expeditor_number = fields.Char(
        string="ONSS Expeditor Number", groups="base.group_system",
        help="ONSS Expeditor Number provided when registering service on the technical user")
    onss_pem_certificate = fields.Binary(
        string="PEM Certificate", groups="base.group_system",
        help="Certificate to allow access to batch declarations")
    onss_key = fields.Binary(
        string="KEY file", groups="base.group_system",
        help="Key to allow access to batch declarations")
    onss_pem_passphrase = fields.Char(
        string="PEM Passphrase", groups="base.group_system",
        help="Certificate to allow access to batch declarations")

    @ormcache('self.id')
    def _get_workers_count(self):
        self.ensure_one()
        return len(self.env['hr.contract'].search([
            ('state', '=', 'open'),
            ('company_id', '=', self.id)]).employee_id)

    @api.constrains('sdworx_code')
    def _check_sdworx_code(self):
        if self.sdworx_code and len(self.sdworx_code) != 7:
            raise ValidationError(_('The code should have 7 characters!'))

    @api.constrains('l10n_be_company_number')
    def _check_l10n_be_company_number(self):
        for company in self.filtered(lambda c: c.l10n_be_company_number):
            number = company.l10n_be_company_number
            if not number.isdecimal() or len(number) != 10 or (not number.startswith('0') and not number.startswith('1')):
                raise ValidationError(_("The company number should contain digits only, starts with a '0' or a '1' and be 10 characters long."))

    def _prepare_resource_calendar_values(self):
        """
        Override to set the default calendar to
        38 hours/week for Belgian companies
        """
        vals = super()._prepare_resource_calendar_values()
        if self.country_id.code == 'BE':
            vals.update({
                'name': _('Standard 38 hours/week'),
                'hours_per_day': 7.6,
                'full_time_required_hours': 38.0,
                'attendance_ids': [
                    (0, 0, {'name': 'Monday Morning', 'dayofweek': '0', 'hour_from': 8, 'hour_to': 12, 'day_period': 'morning'}),
                    (0, 0, {'name': 'Monday Afternoon', 'dayofweek': '0', 'hour_from': 13, 'hour_to': 16.6, 'day_period': 'afternoon'}),
                    (0, 0, {'name': 'Tuesday Morning', 'dayofweek': '1', 'hour_from': 8, 'hour_to': 12, 'day_period': 'morning'}),
                    (0, 0, {'name': 'Tuesday Afternoon', 'dayofweek': '1', 'hour_from': 13, 'hour_to': 16.6, 'day_period': 'afternoon'}),
                    (0, 0, {'name': 'Wednesday Morning', 'dayofweek': '2', 'hour_from': 8, 'hour_to': 12, 'day_period': 'morning'}),
                    (0, 0, {'name': 'Wednesday Afternoon', 'dayofweek': '2', 'hour_from': 13, 'hour_to': 16.6, 'day_period': 'afternoon'}),
                    (0, 0, {'name': 'Thursday Morning', 'dayofweek': '3', 'hour_from': 8, 'hour_to': 12, 'day_period': 'morning'}),
                    (0, 0, {'name': 'Thursday Afternoon', 'dayofweek': '3', 'hour_from': 13, 'hour_to': 16.6, 'day_period': 'afternoon'}),
                    (0, 0, {'name': 'Friday Morning', 'dayofweek': '4', 'hour_from': 8, 'hour_to': 12, 'day_period': 'morning'}),
                    (0, 0, {'name': 'Friday Afternoon', 'dayofweek': '4', 'hour_from': 13, 'hour_to': 16.6, 'day_period': 'afternoon'})
                ],
            })
        return vals

    def _neutralize(self):
        super()._neutralize()
        self.flush_model()
        self.invalidate_model()
        self.env.cr.execute("""
            UPDATE res_company
            SET onss_expeditor_number = 'dummy',
                onss_pem_passphrase = 'dummy'
        """)
