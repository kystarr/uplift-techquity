# Business Profile Layout — Design Explanation

## Component hierarchy tree

```
BusinessProfileLayout
├── nav (Breadcrumb + Back button)
├── BusinessHeader
│   ├── name + Verification badge
│   ├── BusinessRating → RatingDisplay (stars + numeric + count)
│   ├── CategoryBadge[] (categories)
│   └── BusinessTags → TagBadge[] (tags)
├── section (Gallery)
│   └── BusinessGallery (images grid)
├── section (About)
│   └── description
└── section (Contact + Reviews)
    ├── ReviewsPreview
    │   └── RatingDisplay + review list + "View all"
    └── BusinessContactCard (email, phone, website)
```

## Why components were separated

- **Single responsibility**: Each subcomponent has one job (header metadata, tags, rating, contact, gallery, reviews). This keeps each file small and testable.
- **Reusability**: `TagBadge`, `CategoryBadge`, `RatingDisplay` are used in `BusinessHeader` and can be reused in `BusinessCard`, search filters, and edit UI. `BusinessContactCard` and `BusinessGallery` can be reused on dashboards or in modals.
- **Easier changes**: Changing how ratings look only touches `RatingDisplay`; changing contact layout only touches `BusinessContactCard`.
- **Clear boundaries**: Layout doesn’t fetch data; it receives a `business` object and optional `reviewsPreview`. Data flow stays in the page/hook layer.

## Reusability considerations

- **TagBadge / CategoryBadge / RatingDisplay**: Built as presentational, prop-driven components with `React.memo` so they can be used anywhere (profile, cards, edit form) without pulling in layout-specific logic.
- **BusinessHeader**: Encapsulates “profile header” so the same block can be reused on a print view or in an embed without duplicating structure.
- **BusinessContactCard / BusinessGallery**: Accept minimal props (contact fields, image URLs) so they work with any data source (API, mock, or cached).

## State boundaries

- **No local state in layout**: `BusinessProfileLayout` is presentational. All state (business data, reviews, loading, error) lives in the page or in `useBusinessProfile` / `useEditBusinessProfile`. This avoids duplicate sources of truth and keeps the layout predictable.
- **Child components are controlled**: Tags, categories, rating, contact, gallery, and reviews are all driven by props. When the parent passes new data (e.g. after an optimistic update), the UI updates without extra state in the layout.
- **Navigation**: Breadcrumb and back link receive `backHref` from the page so the profile can be opened from search, favorites, or messages and still link back correctly.

## Future improvements

- **Caching**: When integrating with a data layer (e.g. TanStack Query), cache `Business` by `id` so repeated visits don’t refetch unnecessarily.
- **Pagination**: `ReviewsPreview` could accept a “load more” or paginated list from the API; the layout stays the same, only the data shape and hook change.
- **Scale**: At 100k+ businesses, image optimization (CDN, lazy loading, aspect-ratio reserved) and virtualized review list can be added inside `BusinessGallery` and `ReviewsPreview` without changing the layout contract.
