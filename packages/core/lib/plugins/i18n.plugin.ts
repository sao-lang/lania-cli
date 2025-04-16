type LocaleMap = Record<string, string>;

export class I18nPlugin {
    private locales: Record<string, LocaleMap> = {};
    private currentLocale: string = 'en';

    constructor(defaultLocale: string = 'en') {
        this.currentLocale = defaultLocale;
    }

    load(locale: string, messages: LocaleMap) {
        this.locales[locale] = messages;
    }

    setLocale(locale: string) {
        this.currentLocale = locale;
    }

    t(key: string, replacements: Record<string, string> = {}): string {
        const message = this.locales[this.currentLocale]?.[key] || key;
        return Object.entries(replacements).reduce(
            (msg, [k, v]) => msg.replace(`{${k}}`, v),
            message,
        );
    }
}
