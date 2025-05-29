# Router Documentation

## routeToRegExp Method

The `routeToRegExp` method converts URL route patterns into regular expressions for route matching. This method is inspired by Backbone's router implementation and supports various parameter types.

### Syntax
```javascript
router.routeToRegExp(route)
```

### Parameters
- `route` (String): The route pattern to convert to a regular expression

### Return Value
Returns a RegExp object that can be used to match URLs against the route pattern.

### Supported Pattern Types

1. **Optional Parameters**: `(param)`
   - Matches optional segments in the URL
   - Example: `/items(/:id)` matches both `/items` and `/items/123`

2. **Named Parameters**: `:param`
   - Matches any segment in the URL and captures it as a parameter
   - Example: `/users/:id` matches `/users/123`

3. **Splat Parameters**: `*param`
   - Matches any number of URL segments
   - Example: `/files/*path` matches `/files/folder/subfolder/file.txt`

### Examples

```javascript
const router = new Router();

// Example 1: Simple route
router.routeToRegExp('/users')
// Matches: /users
// Does not match: /users/123, /user

// Example 2: Route with named parameter
router.routeToRegExp('/users/:id')
// Matches: /users/123, /users/abc
// Does not match: /users, /users/123/edit

// Example 3: Route with optional parameter
router.routeToRegExp('/items(/:id)')
// Matches: /items, /items/123
// Does not match: /items/123/edit

// Example 4: Route with splat parameter
router.routeToRegExp('/files/*path')
// Matches: /files/document.pdf, /files/images/photo.jpg
// Matches any number of segments after /files/

// Example 5: Route with query parameters
router.routeToRegExp('/search')
// Matches: /search, /search?q=test
// The query parameters are captured in the regex
```

### Regular Expression Components

The method uses several regex patterns to handle different URL components:

1. `escapeRegExp`: `/[\-{}\[\]+?.,\\\^$|#\s]/g`
   - Escapes special regex characters in the route

2. `optionalParam`: `/\((.*?)\)/g`
   - Matches optional parameters in parentheses

3. `namedParam`: `/(\(\?)?:\w+/g`
   - Matches named parameters starting with ':'

4. `splatParam`: `/\*\w+/g`
   - Matches splat parameters starting with '*'

### Notes

- The method automatically handles query strings in URLs
- All routes are anchored to the start of the string with `^`
- The method is case-sensitive
- Special characters in routes should be escaped properly 