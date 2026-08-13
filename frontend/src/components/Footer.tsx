import React from 'react'
import { Shield, Mail, Smartphone } from 'lucide-react'

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-gray-800 text-gray-100 mt-16">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Company Info */}
          <div>
            <h3 className="text-lg font-bold text-white mb-4">Visibilita360</h3>
            <p className="text-gray-400 text-sm mb-4">
              Analizza il tuo posizionamento di mercato in 5 minuti con l'intelligenza artificiale.
            </p>
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
              <Mail className="w-4 h-4" />
              <span>privacy@visibilita360.it</span>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Legal
            </h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="/privacy-policy.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-blue-400 transition text-sm"
                >
                  Privacy Policy
                </a>
              </li>
              <li>
                <a
                  href="#terms"
                  className="text-gray-400 hover:text-blue-400 transition text-sm"
                >
                  Terms of Service
                </a>
              </li>
              <li>
                <a
                  href="#cookies"
                  className="text-gray-400 hover:text-blue-400 transition text-sm"
                >
                  Cookie Policy
                </a>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              Support
            </h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="mailto:privacy@visibilita360.it"
                  className="text-gray-400 hover:text-blue-400 transition text-sm"
                >
                  Contact Us
                </a>
              </li>
              <li>
                <a
                  href="#faq"
                  className="text-gray-400 hover:text-blue-400 transition text-sm"
                >
                  FAQ
                </a>
              </li>
              <li>
                <a
                  href="#help"
                  className="text-gray-400 hover:text-blue-400 transition text-sm"
                >
                  Help Center
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-700 pt-8">
          {/* Compliance Notice */}
          <div className="bg-gray-900 rounded-lg p-4 mb-4">
            <p className="text-gray-400 text-xs mb-2">
              <strong>Conformità Normativa:</strong> Questo sito è conforme al GDPR (Regolamento (UE) 2016/679),
              alla Legge n. 196/2003 italiana e ai requisiti di accessibilità EU 2019/882.
            </p>
            <p className="text-gray-400 text-xs">
              <strong>Data Processors:</strong> Moonshot Inc. (Kimi API) -
              <a
                href="https://www.moonshot.cn/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 ml-1"
              >
                Privacy Policy
              </a>
            </p>
          </div>

          {/* Bottom Bar */}
          <div className="flex flex-col md:flex-row justify-between items-center text-gray-400 text-sm">
            <p>&copy; {currentYear} Visibilita360. Tutti i diritti riservati.</p>
            <div className="flex gap-4 mt-4 md:mt-0">
              <a href="/privacy-policy.html" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition">
                Privacy
              </a>
              <a href="#" className="hover:text-blue-400 transition">
                Security
              </a>
              <a href="#" className="hover:text-blue-400 transition">
                Contact
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
