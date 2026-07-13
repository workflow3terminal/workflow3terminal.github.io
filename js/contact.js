const copy = {
  cs: {
    errors: {
      name: "Napište prosím alespoň dvě písmena.",
      email: "Zadejte platnou e-mailovou adresu.",
      company_url: "Když web nebo stopu vyplníte, použijte prosím adresu začínající http:// nebo https://.",
      problem: "Popište problém alespoň dvaceti znaky.",
      desired_result: "Popište očekávaný výsledek alespoň dvaceti znaky.",
      budget: "Vyberte orientační rozpočet.",
      preferred_time: "Vyberte časový horizont.",
    },
    sending: "Připravuji zprávu ve vašem e-mailu…",
    success: "E-mailová zpráva je připravená. Odešlete ji prosím ze své poštovní aplikace.",
    interest: (name) => `Mám zájem o připravovanou položku ${name} a chci vědět, až bude dostupná.`,
    failure: "Odeslání se nepovedlo. Vaše texty zůstaly zachované; můžete to zkusit znovu nebo napsat přímo.",
    invalid: "Některé údaje server odmítl. Zkontrolujte formulář a zkuste to znovu.",
    limited: "Těch žádostí je teď příliš mnoho. Zkuste to později nebo použijte přímý e-mail.",
  },
  en: {
    errors: {
      name: "Please enter at least two characters.",
      email: "Enter a valid email address.",
      company_url: "If you include a public link, use a URL beginning with http:// or https://.",
      problem: "Describe the problem in at least twenty characters.",
      desired_result: "Describe the desired result in at least twenty characters.",
      budget: "Select an approximate budget.",
      preferred_time: "Select a time horizon.",
    },
    sending: "Preparing the message in your email app…",
    success: "Your email message is ready. Please send it from your mail app.",
    interest: (name) => `I am interested in the upcoming ${name} item and want to know when it becomes available.`,
    failure: "The request could not be sent. Your text is preserved; try again or use direct email.",
    invalid: "The server rejected some fields. Review the form and try again.",
    limited: "Too many requests were submitted. Try later or use direct email.",
  },
};
const language = document.documentElement.lang === "en" ? "en" : "cs";
const messages = copy[language];

const setStartedAt = (form) => {
  const input = form.elements.namedItem("form_started_at");
  if (input instanceof HTMLInputElement && !input.value) {
    input.value = String(Math.floor(Date.now() / 1000));
  }
};

const fieldValue = (form, name) => {
  const field = form.elements.namedItem(name);
  return field && "value" in field ? String(field.value).trim() : "";
};

const isValidUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const validate = (form) => {
  const values = Object.fromEntries(new FormData(form).entries());
  const errors = {};
  if (fieldValue(form, "name").length < 2) errors.name = messages.errors.name;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fieldValue(form, "email"))) errors.email = messages.errors.email;
  const companyUrl = fieldValue(form, "company_url");
  if (companyUrl && !isValidUrl(companyUrl)) errors.company_url = messages.errors.company_url;
  if (fieldValue(form, "problem").length < 20) errors.problem = messages.errors.problem;
  if (fieldValue(form, "desired_result").length < 20) errors.desired_result = messages.errors.desired_result;
  if (!fieldValue(form, "budget")) errors.budget = messages.errors.budget;
  if (!fieldValue(form, "preferred_time")) errors.preferred_time = messages.errors.preferred_time;
  return { values, errors };
};

const showErrors = (form, errors) => {
  form.querySelectorAll("[data-error-for]").forEach((node) => {
    const name = node.dataset.errorFor;
    const message = errors[name] ?? "";
    node.textContent = message;
    const field = form.elements.namedItem(name);
    if (field instanceof HTMLElement) field.setAttribute("aria-invalid", String(Boolean(message)));
  });
  const first = Object.keys(errors)[0];
  const field = first ? form.elements.namedItem(first) : null;
  if (field instanceof HTMLElement) field.focus();
};

const errorMessage = (code) => {
  if (code === "rate_limited") return messages.limited;
  if (code === "invalid_fields") return messages.invalid;
  return messages.failure;
};

export function initContactForms({
  openerSelector = "[data-contact-open]",
  formSelector = "[data-contact-form]",
} = {}) {
  const dialog = document.querySelector("#contact-dialog");
  const openers = [...document.querySelectorAll(openerSelector)];
  const forms = [...document.querySelectorAll(formSelector)];
  let previousFocus = null;

  const close = () => {
    if (dialog instanceof HTMLDialogElement && dialog.open) dialog.close();
  };

  openers.forEach((opener) => {
    opener.addEventListener("click", (event) => {
      if (!(dialog instanceof HTMLDialogElement)) return;
      event.preventDefault();
      previousFocus = opener;
      const interest = opener.dataset.interest;
      if (interest && forms[0]) {
        const result = forms[0].elements.namedItem("desired_result");
        if (result && "value" in result && !result.value) {
          result.value = messages.interest(interest);
        }
      }
      forms.forEach(setStartedAt);
      if (dialog instanceof HTMLDialogElement) {
        dialog.showModal();
        dialog.querySelector("input, textarea, select")?.focus();
      }
    });
  });

  dialog?.querySelector("[data-contact-close]")?.addEventListener("click", close);
  dialog?.addEventListener("click", (event) => {
    if (event.target === dialog) close();
  });
  dialog?.addEventListener("close", () => {
    if (previousFocus instanceof HTMLElement) previousFocus.focus();
  });

  forms.forEach((form) => {
    const formIdentity = form.id || `contact-${forms.indexOf(form) + 1}`;
    form.querySelectorAll("[data-error-for]").forEach((node) => {
      const name = node.dataset.errorFor;
      const field = name ? form.elements.namedItem(name) : null;
      if (!(field instanceof HTMLElement) || !name) return;
      node.id ||= `${formIdentity}-${name}-error`;
      field.setAttribute("aria-describedby", node.id);
      field.setAttribute("aria-errormessage", node.id);
    });
    setStartedAt(form);
    const interest = new URLSearchParams(window.location.search).get("interest");
    if (interest) {
      const result = form.elements.namedItem("desired_result");
      if (result && "value" in result && !result.value) result.value = messages.interest(interest);
    }
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const status = form.querySelector("[data-form-status]");
      const submit = form.querySelector('button[type="submit"]');
      const { values, errors } = validate(form);
      showErrors(form, errors);
      if (Object.keys(errors).length) return;

      if (submit instanceof HTMLButtonElement) submit.disabled = true;
      if (status) status.textContent = messages.sending;

      const labels = language === "en"
        ? {
            name: "Name",
            email: "Reply email",
            company_url: "Company / public link",
            problem: "Current problem",
            desired_result: "Desired result",
            budget: "Approximate budget",
            preferred_time: "Time horizon",
            call_window: "Preferred call window",
          }
        : {
            name: "Jméno",
            email: "E-mail pro odpověď",
            company_url: "Firma / veřejná stopa",
            problem: "Kde to teče",
            desired_result: "Co má být jiné",
            budget: "Orientační rozpočet",
            preferred_time: "Časový horizont",
            call_window: "Preferovaný čas hovoru",
          };
      const body = Object.entries(labels)
        .map(([key, label]) => `${label}: ${String(values[key] || "—").trim() || "—"}`)
        .join("\n\n");
      const subject = language === "en"
        ? "Project inquiry — Ducháč gets it handled"
        : "Poptávka — Ducháč to zařídí";
      const mailto = `mailto:duchac.david@icloud.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

      window.location.href = mailto;
      if (status) {
        status.innerHTML = `${messages.success} <a href="${mailto}">Otevřít e-mail znovu</a>`;
      }
      form.querySelectorAll("[aria-invalid]").forEach((field) => field.removeAttribute("aria-invalid"));
      if (submit instanceof HTMLButtonElement) submit.disabled = false;
    });
  });
}
