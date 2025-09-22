//! Wraps Windows `ISearchCrawlScopeManager`

mod searchapi_h_bindings;

use searchapi_h_bindings::CLSID_CSEARCH_MANAGER;
use searchapi_h_bindings::IID_ISEARCH_MANAGER;
use searchapi_h_bindings::{
    HRESULT, ISearchCatalogManager, ISearchCatalogManagerVtbl, ISearchCrawlScopeManager,
    ISearchCrawlScopeManagerVtbl, ISearchManager,
};
use std::ffi::OsStr;
use std::ffi::OsString;
use std::os::windows::ffi::OsStrExt;
use std::path::Path;
use std::path::PathBuf;
use std::ptr::null_mut;
use windows::core::w;
use windows_sys::Win32::Foundation::S_OK;
use windows_sys::Win32::System::Com::{
    CLSCTX_LOCAL_SERVER, COINIT_APARTMENTTHREADED, CoCreateInstance, CoInitializeEx, CoUninitialize,
};

#[derive(Debug, thiserror::Error)]
#[error("{msg}, function [{function}], HRESULT [{hresult}]")]
pub(crate) struct WindowSearchApiError {
    function: &'static str,
    hresult: HRESULT,
    msg: String,
}

/// See doc of [`Rule`].
#[derive(Debug, PartialEq)]
pub(crate) enum RuleMode {
    Inclusion,
    Exclusion,
}

/// A rule adds or removes one or more paths to/from the Windows Search index.
#[derive(Debug)]
pub(crate) struct Rule {
    /// A path or path pattern (wildcard supported, only for exclusion rule) that
    /// specifies the paths that this rule applies to.
    ///
    /// The rules used by Windows Search actually specify URLs rather than paths,
    /// but we only care about paths, i.e., URLs with schema `file://`
    pub(crate) paths: PathBuf,
    /// Add or remove paths to/from the index.
    pub(crate) mode: RuleMode,
}

/// A wrapper around Window's `ISearchCrawlScopeManager` type
pub(crate) struct CrawlScopeManager {
    i_search_crawl_scope_manager: *mut ISearchCrawlScopeManager,
}

impl CrawlScopeManager {
    fn vtable(&self) -> *mut ISearchCrawlScopeManagerVtbl {
        unsafe { (*self.i_search_crawl_scope_manager).lpVtbl }
    }

    pub(crate) fn new() -> Result<Self, WindowSearchApiError> {
        unsafe {
            // 1. Initialize the COM library, use Apartment-threading as Self is not Send/Sync
            let hr = CoInitializeEx(null_mut(), COINIT_APARTMENTTHREADED as u32);
            if hr != S_OK {
                return Err(WindowSearchApiError {
                    function: "CoInitializeEx()",
                    hresult: hr,
                    msg: "failed to initialize the COM library".into(),
                });
            }

            // 2. Create an instance of the CSearchManager.
            let mut search_manager: *mut ISearchManager = null_mut();
            let hr = CoCreateInstance(
                &CLSID_CSEARCH_MANAGER,                  // CLSID of the object
                null_mut(),                              // No outer unknown
                CLSCTX_LOCAL_SERVER,                     // Server context
                &IID_ISEARCH_MANAGER,                    // IID of the interface we want
                &mut search_manager as *mut _ as *mut _, // Pointer to receive the interface
            );
            if hr != S_OK {
                return Err(WindowSearchApiError {
                    function: "CoCreateInstance()",
                    hresult: hr,
                    msg: "failed to initialize ISearchManager".into(),
                });
            }
            assert!(!search_manager.is_null());

            let search_manger_vtable = (*search_manager).lpVtbl;
            let search_manager_fn_get_catalog = (*search_manger_vtable).GetCatalog.unwrap();
            let mut search_catalog_manager: *mut ISearchCatalogManager = null_mut();
            let string_literal_system_index = w!("SystemIndex");
            let hr: HRESULT = search_manager_fn_get_catalog(
                search_manager,
                string_literal_system_index.0,
                &mut search_catalog_manager as *mut *mut ISearchCatalogManager,
            );
            if hr != S_OK {
                return Err(WindowSearchApiError {
                    function: "ISearchManager::GetCatalog()",
                    hresult: hr,
                    msg: "failed to initialize ISearchCatalogManager".into(),
                });
            }
            assert!(!search_catalog_manager.is_null());

            let search_catalog_manager_vtable: *mut ISearchCatalogManagerVtbl =
                (*search_catalog_manager).lpVtbl;
            let fn_get_crawl_scope_manager = (*search_catalog_manager_vtable)
                .GetCrawlScopeManager
                .unwrap();
            let mut search_crawl_scope_manager: *mut ISearchCrawlScopeManager = null_mut();
            let hr =
                fn_get_crawl_scope_manager(search_catalog_manager, &mut search_crawl_scope_manager);
            if hr != S_OK {
                return Err(WindowSearchApiError {
                    function: "ISearchCatalogManager::GetCrawlScopeManager()",
                    hresult: hr,
                    msg: "failed to initialize ISearchCrawlScopeManager".into(),
                });
            }
            assert!(!search_crawl_scope_manager.is_null());

            Ok(Self {
                i_search_crawl_scope_manager: search_crawl_scope_manager,
            })
        }
    }

    /// Does nothing unless you [`commit()`] the changes.
    pub(crate) fn add_rule(&mut self, rule: Rule) -> Result<(), WindowSearchApiError> {
        unsafe {
            let vtable = self.vtable();

            let fn_add_rule = (*vtable).AddUserScopeRule.unwrap();

            let url: Vec<u16> = encode_path(&rule.paths);
            let inclusion = (rule.mode == RuleMode::Inclusion) as i32;
            let override_child_rules = true as i32;
            let follow_flag = 0x1_u32; /* FF_INDEXCOMPLEXURLS */

            let hr = fn_add_rule(
                self.i_search_crawl_scope_manager,
                url.as_ptr(),
                inclusion,
                override_child_rules,
                follow_flag,
            );

            if hr != S_OK {
                return Err(WindowSearchApiError {
                    function: "ISearchCrawlScopeManager::AddUserScopeRule()",
                    hresult: hr,
                    msg: "failed to add scope rule".into(),
                });
            }

            Ok(())
        }
    }

    pub(crate) fn is_path_included<P: AsRef<Path> + ?Sized>(
        &self,
        path: &P,
    ) -> Result<bool, WindowSearchApiError> {
        unsafe {
            let vtable = self.vtable();
            let fn_included_in_crawl_scope = (*vtable).IncludedInCrawlScope.unwrap();
            let path: Vec<u16> = encode_path(path);

            let mut included: i32 = 0 /* false */;

            let hr = fn_included_in_crawl_scope(
                self.i_search_crawl_scope_manager,
                path.as_ptr(),
                &mut included,
            );
            if hr != S_OK {
                return Err(WindowSearchApiError {
                    function: "ISearchCrawlScopeManager::IncludedInCrawlScope()",
                    hresult: hr,
                    msg: "failed to call IncludedInCrawlScope()".into(),
                });
            }

            Ok(included == 1)
        }
    }

    pub(crate) fn commit(&self) -> Result<(), WindowSearchApiError> {
        unsafe {
            let vtable = self.vtable();
            let fn_commit = (*vtable).SaveAll.unwrap();
            let hr = fn_commit(self.i_search_crawl_scope_manager);
            if hr != S_OK {
                return Err(WindowSearchApiError {
                    function: "ISearchCrawlScopeManager::SaveAll()",
                    hresult: hr,
                    msg: "failed to commit the changes".into(),
                });
            }

            Ok(())
        }
    }
}

impl Drop for CrawlScopeManager {
    fn drop(&mut self) {
        unsafe {
            CoUninitialize();
        }
    }
}

fn encode_path<P: AsRef<Path> + ?Sized>(path: &P) -> Vec<u16> {
    let mut buffer = OsString::new();

    // schema
    buffer.push("file:///");
    buffer.push(path.as_ref().as_os_str());

    osstr_to_wstr(&buffer)
}

fn osstr_to_wstr<S: AsRef<OsStr> + ?Sized>(str: &S) -> Vec<u16> {
    let os_str: &OsStr = str.as_ref();
    let mut chars = os_str.encode_wide().collect::<Vec<u16>>();
    chars.push(0 /* NUL */);

    chars
}
