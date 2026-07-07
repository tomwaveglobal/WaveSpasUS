/**
 * <staged-product-bundle>
 *
 * A multi-stage "bundle builder" flow. Each stage (a section block) is its own
 * pool of products with its own pick limit and required/optional flag. The
 * customer advances stage-by-stage; a running summary collects their picks and
 * a single combined add-to-cart submits all selected variants at once.
 *
 * It reuses the existing bundle product cards: `product-bundle-form` dispatches
 * a `bundle:added` event (and `product-bundle-remove-button` a `bundle:removed`
 * event) to the element referenced by the card's `aria-controls` — which is
 * this element. We read `event.detail.product` (the .product-card) to work out
 * which stage the pick belongs to.
 */
class StagedProductBundle extends HTMLElement {
  constructor() {
    super();

    this.current = 0;
    this.stages = Array.from(this.querySelectorAll('[data-stage]')).map((el) => ({
      el,
      index: parseInt(el.getAttribute('data-stage'), 10),
      maxPicks: parseInt(el.getAttribute('data-max-picks'), 10) || 1,
      required: el.hasAttribute('data-required'),
      selections: [],
    }));

    this.addEventListener('bundle:added', this.onAdd.bind(this));
    this.addEventListener('bundle:removed', this.onRemove.bind(this));

    // Edit-after-adding: when a customer changes the options on a card that's
    // already in the bundle, update its line in place instead of forcing a
    // remove + re-add. ProductInfo publishes `variantChange` once the async
    // option swap has resolved, carrying the resolved variant.
    this.onCardVariantChange = this.onCardVariantChange.bind(this);
    this.variantChangeUnsubscriber = theme.pubsub.subscribe(
      theme.pubsub.PUB_SUB_EVENTS.variantChange,
      this.onCardVariantChange
    );

    // Tapping the already-selected colour on an added card removes just that
    // pick (switching to a different colour is handled by the change above).
    this.addEventListener('click', this.onPickerClick.bind(this));

    this.nextButton?.addEventListener('click', () => this.goTo(this.current + 1));
    this.prevButton?.addEventListener('click', () => this.goTo(this.current - 1));
    this.submitButton?.addEventListener('click', this.onSubmit.bind(this));

    this.querySelectorAll('[data-staged-bundle-step]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = parseInt(btn.getAttribute('data-staged-bundle-step'), 10);
        // goTo validates forward moves (required stages must be satisfied first).
        this.goTo(target);
      });
    });

    this.refresh();
  }

  get nextButton() {
    return this.querySelector('[data-staged-bundle-next]');
  }

  get prevButton() {
    return this.querySelector('[data-staged-bundle-prev]');
  }

  get submitButton() {
    return this.querySelector('[data-staged-bundle-submit]');
  }

  get selectionList() {
    return this.querySelector('[data-staged-bundle-selections]');
  }

  get cartDrawer() {
    return document.querySelector('cart-drawer');
  }

  get lastStageIndex() {
    return this.stages.length - 1;
  }

  get allSelections() {
    return this.stages.flatMap((stage) => stage.selections);
  }

  /* ---- selection handling ---- */

  onAdd(event) {
    const card = event.detail.product;
    const variant = event.detail.variant;
    if (!card || !variant) return;

    const stageEl = card.closest('[data-stage]');
    if (!stageEl) return;
    const stage = this.stages[parseInt(stageEl.getAttribute('data-stage'), 10)];
    if (!stage || stage.selections.length >= stage.maxPicks) return;

    const li = this.buildSelection(card, variant, stage.index);
    this.selectionList?.appendChild(li);
    const price = parseInt(variant.price, 10) || 0;
    const compareAt = parseInt(variant.compare_at_price, 10) || 0;
    stage.selections.push({ variantId: variant.id, price, compareAt, variant, card, li });

    // Lock the chosen card so it can't be added twice.
    card.setAttribute('locked', '');
    // Lock the whole stage once it's at its pick limit.
    if (stage.selections.length >= stage.maxPicks) stageEl.setAttribute('locked', '');

    this.refresh();
    this.maybeAutoAdvance(stage);
  }

  // Once a stage is filled to its pick limit, move the customer straight to the
  // next step (or, on the final stage, bring the summary into view). Keeps the
  // mobile flow moving without an extra tap on "Next".
  maybeAutoAdvance(stage) {
    if (stage.index !== this.current) return;
    if (stage.selections.length < stage.maxPicks) return;

    if (this.current < this.lastStageIndex && this.canAdvanceFrom(this.current)) {
      setTimeout(() => this.goTo(this.current + 1), 350);
    } else if (this.current >= this.lastStageIndex) {
      setTimeout(() => {
        this.querySelector('[data-staged-bundle-selections]')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 350);
    }
  }

  onRemove(event) {
    const li = event.detail.variant;
    if (!li || !li.hasAttribute('data-staged-selection')) return;
    this.removeSelection(li);
  }

  removeSelection(li) {
    const stage = this.stages[parseInt(li.getAttribute('data-stage'), 10)];
    if (stage) {
      const idx = stage.selections.findIndex((sel) => sel.li === li);
      if (idx > -1) {
        stage.selections[idx].card?.removeAttribute('locked');
        stage.selections.splice(idx, 1);
      }
      stage.el.removeAttribute('locked');
    }
    li.remove();
    this.refresh();
  }

  findSelectionByCard(card) {
    for (const stage of this.stages) {
      const sel = stage.selections.find((s) => s.card === card);
      if (sel) return { stage, sel };
    }
    return null;
  }

  // A card already in the bundle had its options changed → refresh its line
  // (price, options, image) in place. `variant` is the resolved variant from
  // ProductInfo's `variantChange` event.
  onCardVariantChange(payload) {
    const variant = payload?.data?.variant;
    const productId = payload?.data?.productId;
    if (!variant || variant.id == null) return;

    for (const stage of this.stages) {
      for (const sel of stage.selections) {
        // Match the changed product's card; skip if this pick already matches.
        if (productId != null && !sel.card.querySelector(`[data-product-id="${productId}"]`)) continue;
        if (sel.variantId === variant.id) continue;

        sel.variantId = variant.id;
        sel.price = parseInt(variant.price, 10) || 0;
        sel.compareAt = parseInt(variant.compare_at_price, 10) || 0;
        sel.variant = variant;

        const newLi = this.buildSelection(sel.card, variant, stage.index);
        sel.li.replaceWith(newLi);
        sel.li = newLi;
      }
    }
    this.refresh();
  }

  // Re-tapping the already-selected colour swatch on an added card removes that
  // pick. Switching to a different colour falls through to onCardVariantChange.
  onPickerClick(event) {
    const input = event.target.closest('input[type="radio"]');
    if (!input) return;

    const card = input.closest('.product-card');
    if (!card) return;

    const match = this.findSelectionByCard(card);
    if (!match) return; // only cards already in the bundle

    const slug = input.closest('[data-option-slug]')?.getAttribute('data-option-slug') || '';
    if (!(slug.includes('color') || slug.includes('colour'))) return;

    // The option position this swatch belongs to (1-based).
    const position = parseInt(input.getAttribute('data-option-index'), 10);
    const currentValue = match.sel.variant?.options?.[position - 1];
    const clickedValue = input.getAttribute('data-option-value');

    // Only a re-tap of the currently-selected colour removes the pick.
    if (currentValue != null && clickedValue === currentValue) {
      this.removeSelection(match.sel.li);
    }
  }

  disconnectedCallback() {
    this.variantChangeUnsubscriber?.();
  }

  buildSelection(card, variant, stageIndex) {
    const li = document.createElement('li');
    li.className = 'staged-bundle__selection horizontal-product flex items-center gap-3';
    li.setAttribute('data-staged-selection', '');
    // product-bundle-remove-button locates its row via this attribute.
    li.setAttribute('data-product-bundle-variant', '');
    li.setAttribute('data-stage', stageIndex);

    const previewImage = variant.featured_media
      ? variant.featured_media.preview_image.src
      : variant.default_featured_media;

    const title = card.querySelector('[data-product-bundle-title]')?.textContent?.trim() || '';
    const options = (variant.options || [])
      .filter((opt) => opt && opt !== 'Default Title')
      .map((opt) => `<li class="text-xs text-opacity leading-tight">${opt}</li>`)
      .join('');

    li.innerHTML = `
      <figure class="horizontal-product__media media media--square media--contain aspect-square relative overflow-hidden shrink-0"${previewImage ? '' : ' aria-hidden="true"'}>
        ${previewImage ? `<img src="${this.resize(previewImage, 180)}" srcset="${this.resize(previewImage, 180)} 180w, ${this.resize(previewImage, 360)} 360w" loading="lazy" is="lazy-image" alt="" />` : ''}
      </figure>
      <div class="horizontal-product__details grow flex flex-col justify-start gap-1">
        <p class="horizontal-product__title font-medium text-base leading-tight">${title}</p>
        ${options ? `<ul class="grid gap-1d5 m-0 p-0">${options}</ul>` : ''}
        <div class="price text-sm flex flex-wrap gap-1d5">${theme.Currency.formatMoney(variant.price, theme.settings.moneyFormat)}</div>
      </div>
      <div class="horizontal-product__remove shrink-0 text-xs">
        <product-bundle-remove-button class="link cursor-pointer" aria-controls="${this.id}">${this.getAttribute('data-remove-label') || 'Remove'}</product-bundle-remove-button>
      </div>`;

    return li;
  }

  /* ---- navigation ---- */

  canAdvanceFrom(index) {
    const stage = this.stages[index];
    if (!stage) return true;
    return stage.required ? stage.selections.length > 0 : true;
  }

  allRequiredSatisfied() {
    return this.stages.every((stage) => (stage.required ? stage.selections.length > 0 : true));
  }

  // A stage is reachable if every required stage before it has a selection.
  canReach(index) {
    for (let i = 0; i < index; i++) {
      if (!this.canAdvanceFrom(i)) return false;
    }
    return true;
  }

  goTo(index) {
    if (index < 0 || index > this.lastStageIndex) return;
    // Going forward: every stage up to (not including) target must be satisfied.
    if (index > this.current) {
      for (let i = this.current; i < index; i++) {
        if (!this.canAdvanceFrom(i)) {
          this.flagStage(i);
          return;
        }
      }
    }

    this.stages.forEach((stage) => {
      const isActive = stage.index === index;
      stage.el.toggleAttribute('hidden', !isActive);
      stage.el.classList.toggle('is-hidden', !isActive);
      if (isActive) stage.el.querySelector('motion-list')?.load?.();
    });

    this.current = index;
    this.setAttribute('data-current', index);
    this.refresh();
    if (index > 0) {
      this.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  flagStage(index) {
    const stage = this.stages[index];
    if (!stage) return;
    stage.el.classList.add('is-error');
    setTimeout(() => stage.el.classList.remove('is-error'), 1200);
    this.showError(`Please make a selection in step ${index + 1} to continue.`);
  }

  /* ---- ui refresh ---- */

  refresh() {
    const onLast = this.current >= this.lastStageIndex;

    // Stepper state
    this.querySelectorAll('[data-staged-bundle-step]').forEach((btn) => {
      const i = parseInt(btn.getAttribute('data-staged-bundle-step'), 10);
      btn.classList.toggle('is-current', i === this.current);
      btn.classList.toggle('is-done', i < this.current && this.stages[i].selections.length > 0);
      // Clickable if already visited, the current step, or reachable (all
      // required steps before it are satisfied).
      btn.disabled = !(i <= this.current || this.canReach(i));
    });

    // Prev button
    if (this.prevButton) this.prevButton.hidden = this.current === 0;

    // Next vs submit
    if (this.nextButton) this.nextButton.hidden = onLast;
    if (this.submitButton) this.submitButton.hidden = !onLast;

    // Next enabled only when the current stage allows advancing
    if (this.nextButton) this.nextButton.disabled = !this.canAdvanceFrom(this.current);

    // Submit enabled only when all required stages satisfied and at least one item chosen
    if (this.submitButton) {
      this.submitButton.disabled = !(this.allRequiredSatisfied() && this.allSelections.length > 0);
    }

    // Count + empty state + total
    const count = this.allSelections.length;
    const countEl = this.querySelector('[data-staged-bundle-count]');
    if (countEl) countEl.textContent = count;
    const emptyEl = this.querySelector('[data-staged-bundle-empty]');
    if (emptyEl) emptyEl.hidden = count > 0;

    this.updateTotal();
    this.clearError();
  }

  updateTotal() {
    const subtotal = this.allSelections.reduce((sum, sel) => sum + sel.price, 0);
    const el = this.querySelector('[data-staged-bundle-total]');
    if (el) el.innerHTML = theme.Currency.formatMoney(subtotal, theme.settings.moneyWithCurrencyFormat);

    // Savings = sum of (compare-at − price) across picks that are marked down.
    const savings = this.allSelections.reduce(
      (sum, sel) => sum + Math.max((sel.compareAt || 0) - sel.price, 0),
      0
    );
    const savingsRow = this.querySelector('[data-staged-bundle-savings]');
    const savingsAmount = this.querySelector('[data-staged-bundle-savings-amount]');
    if (savingsRow && savingsAmount) {
      savingsRow.hidden = savings <= 0;
      if (savings > 0) {
        savingsAmount.innerHTML = theme.Currency.formatMoney(savings, theme.settings.moneyWithCurrencyFormat);
      }
    }
  }

  /* ---- errors ---- */

  showError(message) {
    const el = this.querySelector('[data-staged-bundle-error]');
    if (!el) return;
    el.textContent = message;
    el.hidden = false;
  }

  clearError() {
    const el = this.querySelector('[data-staged-bundle-error]');
    if (el) el.hidden = true;
  }

  /* ---- add to cart ---- */

  onSubmit(event) {
    if (this.submitButton.hasAttribute('aria-disabled')) return;
    if (!this.allRequiredSatisfied()) {
      const firstMissing = this.stages.findIndex((s) => s.required && s.selections.length === 0);
      if (firstMissing > -1) this.goTo(firstMissing);
      return;
    }

    const items = this.allSelections.map((sel) => ({ id: sel.variantId, quantity: 1 }));
    if (items.length === 0) return;

    const data = { items };

    if (document.body.classList.contains('template-cart') || theme.settings.cartType === 'page') {
      theme.utils.postLink2(theme.routes.cart_add_url, { parameters: { ...data } });
      return;
    }

    this.activeElement = event.submitter || event.currentTarget;
    this.clearError();

    const body = JSON.stringify({ ...data, sections: [], sections_url: window.location.pathname });

    this.submitButton.setAttribute('aria-disabled', 'true');
    this.submitButton.setAttribute('aria-busy', 'true');

    fetch(theme.routes.cart_add_url, { ...theme.utils.fetchConfig('javascript'), body })
      .then((response) => response.json())
      .then(async (parsedState) => {
        if (parsedState.status) {
          this.showError(parsedState.description || parsedState.message);
          return;
        }

        const cartJson = await (await fetch(theme.routes.cart_url, { ...theme.utils.fetchConfig('json', 'GET') })).json();
        cartJson['sections'] = parsedState['sections'];

        theme.pubsub.publish(theme.pubsub.PUB_SUB_EVENTS.cartUpdate, { source: 'staged-product-bundle', cart: cartJson });
        document.dispatchEvent(new CustomEvent('ajaxProduct:added', { detail: { product: parsedState } }));

        this.cartDrawer?.show(this.activeElement);
        this.reset();
      })
      .catch((error) => console.error('[StagedBundle]', error))
      .finally(() => {
        this.submitButton.removeAttribute('aria-busy');
        this.submitButton.removeAttribute('aria-disabled');
      });
  }

  reset() {
    this.stages.forEach((stage) => {
      stage.selections.forEach((sel) => sel.card?.removeAttribute('locked'));
      stage.selections = [];
      stage.el.removeAttribute('locked');
    });
    if (this.selectionList) this.selectionList.innerHTML = '';
    this.goTo(0);
  }

  resize(src, size) {
    return `${src}${src.includes('?') ? '&' : '?'}width=${size}&height=${size}`.replace(/\n|\r|\s/g, '');
  }
}

customElements.define('staged-product-bundle', StagedProductBundle);
