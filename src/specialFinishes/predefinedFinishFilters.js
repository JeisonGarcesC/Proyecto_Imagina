export function filterPredefinedFinishes(items, category, subcategory) {
  return items.filter((finish) => (!category || finish.category === category)
    && (!subcategory || finish.subcategory === subcategory));
}
