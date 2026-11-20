# Code design diagrams

Templates for diagrams of code design: classes, functions and the calls between them inside a
module, as opposed to the architecture diagrams, which show processes, services and data stores.
They use the architecture diagrams' drawing conventions, so the two kinds read as one set:
Helvetica text with a 15px title at the top left, `#222` strokes, right-angle lines drawn before
the boxes, the orange fill `#e8652b`, the light-blue hatch for third-party code, dashed regions,
and a legend that lists only what the view uses.

What each colour means is the same in all three templates:

- **orange** — the thing the diagram is about (the class, the public function, the object);
- **white** — the project's own code;
- **light-blue hatch** — code from a library;
- **dashed region** — a module (one `.py` file), or in a sequence, an `if`/`for`/`try` around
  some calls.

Member lists, signatures, call text and code sketches are set in a monospace font; names of
boxes, labels and the legend are in Helvetica.

| Template | Question it answers | Use when |
|---|---|---|
| `templates/class-structure.svg` | Which classes exist, their methods and attributes, and how they relate: subclassing, attributes that hold another object, construction | the design is a set of classes; a pattern such as a proxy or strategy |
| `templates/function-structure.svg` | Which functions a module has, which calls which and in what order, and which types each returns or raises | the code is functions, not classes; or one long function is being split into helpers |
| `templates/call-sequence.svg` | Which calls happen between objects during one operation, top to bottom in time order | the order of calls is the point: lazy loading, retries, callbacks |

A note (a box with a folded corner) can be added to any of them; a small open circle and a dotted
line attach it to the member, call or fragment it is about.

The sample content in the class and sequence templates is the image proxy from the Proxy
pattern; the function template uses an invented CSV report module. None of it is this project's
code. To start a diagram, copy a template, rename the boxes, delete what the view does not use,
and remove the legend entries for what was deleted. Render it to a PNG and look at it before
committing.

## Diagrams in this repository

`frontend-design.md` is the code design of the React client that replaces `prototype-b/`; its eight
diagrams are in `frontend/`.
