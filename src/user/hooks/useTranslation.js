import { useLanguage } from '../context/LanguageContext';
import { t } from '../../common/utils/i18n';
export function useTranslation() {
  const {
    currentLang
  } = useLanguage();
  const translate = key => t(key, currentLang);
  return {
    t: translate,
    currentLanguage: currentLang
  };
}
