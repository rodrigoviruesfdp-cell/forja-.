import type { Locale } from "@/domain/schemas";
import type { Messages } from "./messages/es";

declare module "use-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: Messages;
  }
}
