import Capacitor
import UIKit

/// Forces portrait-only rotation for the Capacitor WebView shell.
/// Info.plist + AppDelegate are primary; this blocks CAPBridgeViewController /
/// ScreenOrientation plugin from advertising landscape via supportedOrientations.
class MainViewController: CAPBridgeViewController {
    override open var supportedInterfaceOrientations: UIInterfaceOrientationMask {
        .portrait
    }

    override open var preferredInterfaceOrientationForPresentation: UIInterfaceOrientation {
        .portrait
    }

    override open var shouldAutorotate: Bool {
        false
    }

    override open func viewDidLoad() {
        super.viewDidLoad()
        // Keep Capacitor ScreenOrientation plugin's mutable array portrait-only.
        supportedOrientations = [UIInterfaceOrientation.portrait.rawValue]
        enforcePortraitGeometry()
    }

    override open func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        enforcePortraitGeometry()
    }

    override open func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        supportedOrientations = [UIInterfaceOrientation.portrait.rawValue]
    }

    private func enforcePortraitGeometry() {
        if #available(iOS 16.0, *) {
            setNeedsUpdateOfSupportedInterfaceOrientations()
            view.window?.windowScene?.requestGeometryUpdate(.iOS(interfaceOrientations: .portrait)) { _ in }
        }
    }
}
