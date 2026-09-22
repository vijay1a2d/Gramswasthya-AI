import unittest

from routes import passport


class PassportQrLookupTests(unittest.TestCase):
    def test_normalize_passport_id_supports_gsp_prefix_and_uuid(self):
        self.assertEqual(passport.normalize_passport_id('GSP-5CBF969'), 'GSP-5CBF969')
        self.assertEqual(passport.normalize_passport_id('gsp-5cbf969'), 'GSP-5CBF969')
        self.assertEqual(passport.normalize_passport_id('123e4567-e89b-12d3-a456-426614174000'), '123e4567-e89b-12d3-a456-426614174000')

    def test_normalize_passport_id_supports_url_and_json_qr_payloads(self):
        self.assertEqual(
            passport.normalize_passport_id('http://localhost:3000/health-passport?passportId=GSP-5CBF969'),
            'GSP-5CBF969',
        )
        self.assertEqual(
            passport.normalize_passport_id('{"id":"GSP-5CBF969","url":"http://localhost:3000/health-passport?passportId=GSP-5CBF969"}'),
            'GSP-5CBF969',
        )


if __name__ == '__main__':
    unittest.main()
