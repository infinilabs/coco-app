//! The Rust implementation of the Coco extension APIs.
//! 
//! Extension developers do not use these Rust APIs directly, they use our 
//! [Typescript library][ts_lib], which eventually calls these APIs.
//! 
//! [ts_lib]: https://github.com/infinilabs/coco-api

// For the public function names, we use Typescript naming convention, so that 
// it aligns with the interfaces exposed by the coco-api library.
//
// function name: camelCase
#[allow(non_snake_case)]

pub(crate) mod fs;