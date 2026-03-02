import type { CollectionEntry } from "astro:content";
import { slugifyStr } from "./slugify";
import postFilter from "./postFilter";

interface Category {
  category: string;
  categoryName: string;
}

const getUniqueCategories = (posts: CollectionEntry<"blog">[]) => {
  const categories: Category[] = posts
    .filter(postFilter)
    .flatMap(post => post.data.categories ?? [])
    .map(cat => ({ category: slugifyStr(cat), categoryName: cat }))
    .filter(
      (value, index, self) =>
        self.findIndex(cat => cat.category === value.category) === index
    )
    .sort((a, b) => a.category.localeCompare(b.category));
  return categories;
};

export default getUniqueCategories;
