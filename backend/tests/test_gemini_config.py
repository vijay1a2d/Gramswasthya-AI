import importlib
import os
import unittest


class GeminiConfigTests(unittest.TestCase):
    def test_get_gemini_api_key_supports_both_env_names(self):
        module = importlib.import_module('routes.global_assistant')

        os.environ['GEMINI_API_KEY'] = 'gemini-key'
        os.environ.pop('GOOGLE_API_KEY', None)
        self.assertEqual(module.get_gemini_api_key(), 'gemini-key')

        os.environ.pop('GEMINI_API_KEY', None)
        os.environ['GOOGLE_API_KEY'] = 'google-key'
        self.assertEqual(module.get_gemini_api_key(), 'google-key')

        os.environ.pop('GOOGLE_API_KEY', None)


if __name__ == '__main__':
    unittest.main()
