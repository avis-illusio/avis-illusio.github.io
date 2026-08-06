---
title: Draft Example
published: 2022-07-01
tags: [Markdown, Blogging, Demo]
category: Examples
draft: true
---

# This Article is a Draft

This article is currently in a draft state and is not published. Therefore, it will not be visible to the general audience. The content is still a work in progress and may require further editing and review.

When the article is ready for publication, you can update the "draft" field to "false" in the Frontmatter:

```markdown
---
title: Draft Example
published: 2024-01-11T04:40:26.381Z
tags: [Markdown, Blogging, Demo]
category: Examples
draft: false
---
```

```text {1, 5-6} ins={2-3} del={8}
第1行
第2行
第3行
第4行
第5行
第6行
第7行
第8行
```

```js title="demo.js"
function demo() {

}
```

```text "c c++" ins="csharp" del="ruby"
c c++ java
javascript python csharp
rust ruby golang
```

```csharp collapse={4-5, 6-8} title="Demo.cs"
public int Demo()
{
  var i = 1 + 1;

  //折叠区域
  //折叠区域
  //折叠区域

  return i;
}
```